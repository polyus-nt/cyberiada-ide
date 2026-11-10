"""Task-author regressions: python3 -m unittest discover -s tests -p 'test_module_task_checkers.py'.

Use named pictures in these journals: the interpreter's pixel/palette adapters
are tested in sm-interpreter. Here we exercise the authored temporal rules.
"""
import json
import unittest
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'resources' / 'tasks'
COLORS = {
    'black': [0, 0, 0, 0], 'red': [14, 0, 0, 0], 'green': [0, 10, 0, 0],
    'cyan': [0, 12, 10, 0], 'yellow': [10, 2, 0, 0], 'white': [15, 4, 1, 0],
}


def state(color='black', picture='empty'):
    value = COLORS[color] if isinstance(color, str) else color
    return {'eyes': {'right': list(value), 'left': list(value)}, 'picture': picture}


def journal(points, extra=()):
    trace = [{'kind': 'state', 'timeMs': t, 'state': state(c, p)} for t, c, p in points]
    trace.extend(extra)
    return {'status': 'success', 'result': {'trace': sorted(trace, key=lambda e: e['timeMs'])}}


def input_byte(time, value, channel='ears'):
    return {'timeMs': time, 'byte': value, 'channel': channel}


def random_draw(time, value):
    return {'kind': 'random', 'timeMs': time, 'value': value}


def run(name, points, inputs=(), duration=4000, extra=()):
    execution = journal(points, extra)

    def at(execution, time):
        return [event['state'] for event in execution['result']['trace']
                if event['kind'] == 'state' and event['timeMs'] <= time][-1]

    def eyes_are(value, color):
        target = COLORS[color] if isinstance(color, str) else color
        return all((sum(eye[:3]) == 0 if sum(target[:3]) == 0 else
                    sum(eye) > 0 and all(a * sum(target) == b * sum(eye)
                                        for a, b in zip(eye, target)))
                   for eye in value['eyes'].values())

    namespace = {'state_at': at, 'eyes_are': eyes_are,
                 'picture_is': lambda value, picture: value['picture'] == picture}
    source = ROOT / name / 'checker.py'
    exec(compile(source.read_text(), str(source), 'exec'), namespace)
    case = {'input': {'durationMs': duration, 'inputs': list(inputs)}}
    return namespace['check'](case, execution)


class ModuleCheckerTests(unittest.TestCase):
    def test_all_bear_packages_have_compilable_checkers(self):
        packages = list(ROOT.glob('bear-*/*.task.json'))
        self.assertEqual(len(packages), 17)
        for package in packages:
            with self.subTest(task=package.parent.name):
                config = json.loads(package.read_text())
                checker = package.parent / config['checker']['file']
                compile(checker.read_text(), str(checker), 'exec')

    def test_hello_detects_a_one_millisecond_early_flash(self):
        points = [(0, 'cyan', 'empty'), (500, 'black', 'empty'), (1000, 'cyan', 'empty')]
        self.assertTrue(run('bear-hello', points, duration=1499)['passed'])
        points[1] = (499, 'black', 'empty')
        self.assertFalse(run('bear-hello', points, duration=1499)['passed'])

    def test_quiet_hour_stops_blinking_and_restarts_awake(self):
        points = [(t, 'cyan' if t % 1000 == 0 else 'black', 'smile')
                  for t in range(0, 10000, 500)]
        points += [(10000, 'black', 'empty'), (15000, 'cyan', 'smile')]
        self.assertTrue(run('bear-quiet-hour', points, duration=15499)['passed'])
        points[-1] = (15000, 'black', 'smile')
        self.assertFalse(run('bear-quiet-hour', points, duration=15499)['passed'])

    def test_airlock_repeats_both_yellows_and_interrupts_red_after_ten_seconds(self):
        points = []
        for start in (0, 15000, 30000):
            points.extend((start + t, color, picture) for t, color, picture in [
                (0, 'red', 'square'), (3000, 'yellow', 'question'),
                (4000, 'green', 'smile'), (7000, 'yellow', 'question'),
                (8000, 'red', 'square'),
            ] if start + t <= 35000)
            points.extend((start + t, 'yellow' if t % 1000 == 0 else 'black', 'empty')
                          for t in range(10000, 15000, 500) if start + t <= 35000)
        self.assertTrue(run('bear-airlock-traffic', points, duration=35000)['passed'])
        # The first yellow, the second yellow, and the following night/day boundaries
        # are independently required, including the one millisecond before each.
        for time in (3000, 4000, 7000, 8000, 10000, 10500, 15000, 25000, 30000):
            with self.subTest(time=time):
                for offset in (-1, 1):
                    wrong = [(t + offset if t == time else t, color, picture)
                             for t, color, picture in points]
                    self.assertFalse(run('bear-airlock-traffic', wrong,
                                         duration=35000)['passed'])

    def test_airlock_rejects_the_previous_three_color_cycle(self):
        points = [(0, 'red', 'square'), (3000, 'green', 'smile'),
                  (6000, 'yellow', 'question'), (7000, 'red', 'square'),
                  (10000, 'green', 'smile'), (12000, 'yellow', 'empty')]
        self.assertFalse(run('bear-airlock-traffic', points, duration=12000)['passed'])

    def test_code_can_restart_with_three_and_stays_open(self):
        values = [3, 1, 3, 1, 4, 0]
        events = [input_byte((i + 1) * 500, value) for i, value in enumerate(values)]
        points = [(0, 'red', 'empty'), (2500, 'green', 'smile')]
        self.assertTrue(run('bear-code-lock', points, events)['passed'])
        self.assertFalse(run('bear-code-lock', points + [(3000, 'red', 'empty')], events)['passed'])

    def test_two_identical_hidden_signs_need_a_dark_gap(self):
        events = [input_byte(2000, 7), input_byte(4000, 255)]
        points = [(0, 'black', 'empty'), (2000, 'black', 'triangle'),
                  (3000, 'black', 'empty'), (4000, 'black', 'triangle'),
                  (5000, 'black', 'empty')]
        self.assertTrue(run('bear-hidden-measurements', points, events, 6000)['passed'])
        self.assertFalse(run('bear-hidden-measurements', points[:2] + points[3:], events, 6000)['passed'])

    def test_parcels_are_disjoint_and_first_byte_preserves_previous_result(self):
        events = [input_byte((i + 1) * 500, v) for i, v in enumerate([40, 40, 17, 71, 0])]
        points = [(0, 'black', 'empty'), (1000, 'green', 'smile'), (2000, 'red', 'sadness')]
        self.assertTrue(run('bear-whole-parcel', points, events)['passed'])
        self.assertFalse(run('bear-whole-parcel', points + [(2500, 'black', 'empty')], events)['passed'])

    def test_acoustic_zero_preserves_partial_ir_pair(self):
        events = [input_byte(500, 1, 'ir'), input_byte(700, 0), input_byte(1000, 2, 'ir')]
        points = [(0, 'black', 'empty'), (1000, 'green', 'heart')]
        self.assertTrue(run('bear-two-channels', points, events)['passed'])
        self.assertFalse(run('bear-two-channels', points[:1], events)['passed'])

    def test_foreign_seven_is_not_an_address(self):
        events = [input_byte((i + 1) * 400, v, 'ir') for i, v in enumerate([5, 7, 7, 2])]
        points = [(0, 'black', 'empty'), (1600, 'red', 'sadness')]
        self.assertTrue(run('bear-station-remote', points, events)['passed'])
        self.assertFalse(run('bear-station-remote', [(0, 'black', 'empty'),
                         (1200, 'yellow', 'question'), (1600, 'red', 'sadness')], events)['passed'])

    def test_two_halves_accept_either_order_and_zero_clears_both(self):
        events = [input_byte(500, 3), input_byte(1000, 2, 'ir'), input_byte(1500, 0, 'ir'),
                  input_byte(2000, 1, 'ir'), input_byte(2500, 4)]
        points = [(0, 'black', 'empty'), (500, 'cyan', 'empty'), (1000, 'cyan', 'heart'),
                  (1500, 'black', 'empty'), (2000, 'black', 'square'), (2500, 'yellow', 'square')]
        self.assertTrue(run('bear-two-halves', points, events)['passed'])
        wrong = deepcopy(points)
        wrong[3] = (1500, 'cyan', 'empty')
        self.assertFalse(run('bear-two-halves', wrong, events)['passed'])

    def test_repeated_random_picture_is_valid_but_an_extra_flash_is_not(self):
        points = [(0, 'black', 'empty'), (2000, 'black', 'heart')]
        draws = [random_draw(2000, 1), random_draw(4000, 1)]
        self.assertTrue(run('bear-mood', points, extra=draws)['passed'])
        wrong = points + [(3050, 'black', 'smile'), (3051, 'black', 'heart')]
        self.assertFalse(run('bear-mood', wrong, extra=draws)['passed'])

    def test_every_byte_requires_a_new_draw_even_when_values_and_colors_repeat(self):
        events = [input_byte(1000, 10), input_byte(2000, 10)]
        points = [(0, 'black', 'empty'), (1000, 'green', 'empty')]
        draws = [random_draw(1000, 2), random_draw(2000, 2)]
        self.assertTrue(run('bear-every-byte', points, events, extra=draws)['passed'])
        self.assertFalse(run('bear-every-byte', points, events, extra=draws[:1])['passed'])

    def test_rgbk_requires_four_draws_and_some_chromatic_color(self):
        points = [(0, 'black', 'empty'), (500, [10, 20, 30, 40], 'empty')]
        draws = [random_draw(500, value) for value in [10, 20, 30, 40]]
        self.assertTrue(run('bear-light-music', points, duration=999, extra=draws)['passed'])
        self.assertFalse(run('bear-light-music', points, duration=999, extra=draws[:1])['passed'])
        grey = [(0, 'black', 'empty'), (500, [10, 10, 10, 40], 'empty')]
        self.assertFalse(run('bear-light-music', grey, duration=999,
                            extra=[random_draw(500, v) for v in [10, 10, 10, 40]])['passed'])

    def test_hidden_measurement_variants_decode_the_same_word(self):
        alphabet = 'АБВГДЕЖЗИКЛМНОПР'
        task = json.loads((ROOT / 'bear-hidden-measurements/bear-hidden-measurements.task.json').read_text())
        streams = []
        for case in task['tests']:
            self.assertTrue(case['hideInputs'])
            values = [event['byte'] for event in case['input']['inputs']]
            streams.append(values)
            word = ''.join(alphabet[(values[i] % 4) * 4 + values[i + 1] % 4]
                           for i in range(0, len(values), 2))
            self.assertEqual(word, 'ГОРОД')
        self.assertNotEqual(streams[0], streams[1])


if __name__ == '__main__':
    unittest.main()
