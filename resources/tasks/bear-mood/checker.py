# Checker API v1 helpers are supplied by the interpreter.
def fail(time, message):
    return {"passed": False, "timeMs": time, "message": message}


def moments(case, execution, boundaries=()):
    duration = case["input"]["durationMs"]
    times = {0, duration, *range(0, duration + 1, 100)}
    at = [e["timeMs"] for e in execution["result"]["trace"]]
    at += [e["timeMs"] for e in case["input"]["inputs"]]
    for time in at + list(boundaries):
        times.update(t for t in (time - 1, time, time + 1) if 0 <= t <= duration)
    return sorted(times)


def inputs(case):
    return sorted(case["input"]["inputs"], key=lambda event: event["timeMs"])


def timeline(case, execution, points):
    points = sorted(points, key=lambda point: point[0])
    index = 0
    for t in moments(case, execution, [point[0] for point in points]):
        while index + 1 < len(points) and points[index + 1][0] <= t:
            index += 1
        _, color, picture = points[index]
        state = state_at(execution, t)
        if color is not None and not eyes_are(state, color):
            return fail(t, "Неверный цвет глаз: проверьте входные данные, последовательность и время реакции")
        if picture is not None and not picture_is(state, picture):
            return fail(t, "Неверная картинка на животе: проверьте выбор рисунка и момент выключения")
    return {"passed": True}


def random_events(execution, time):
    return [event for event in execution["result"]["trace"]
            if event["kind"] == "random" and event["timeMs"] == time]

def check(case, execution):
    pictures = ["empty", "heart", "smile", "sadness", "question"]
    points = [(0, "black", "empty")]
    for t in range(2000, case["input"]["durationMs"] + 1, 2000):
        draws = random_events(execution, t)
        valid = [event["value"] for event in draws if 1 <= event["value"] <= 4]
        state = state_at(execution, t)
        choice = next((n for n in valid if picture_is(state, pictures[n])), None)
        if choice is None:
            return fail(t, "Раз в 2 секунды нужна картинка, соответствующая новому случайному числу 1–4")
        points.append((t, "black", pictures[choice]))
    return timeline(case, execution, points)
