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

def same_color(first, second):
    if sum(first[:3]) == sum(second[:3]) == 0:
        return True
    a, b = sum(first), sum(second)
    return a > 0 and b > 0 and all(x * b == y * a for x, y in zip(first, second))


def check(case, execution):
    points = [(0, "black", "empty")]
    has_color = False
    for t in range(500, case["input"]["durationMs"] + 1, 500):
        state = state_at(execution, t)
        right, left = state["eyes"]["right"], state["eyes"]["left"]
        if not same_color(right, left):
            return fail(t, "Оба глаза должны показывать один цвет")
        draws = [draw["value"] for draw in random_events(execution, t) if 0 <= draw["value"] <= 255]
        available = list(draws)
        for number in right:
            if number not in available:
                return fail(t, "Все четыре значения RGBK должны выбираться случайно каждые 500 мс")
            available.remove(number)
        has_color = has_color or len(set(right[:3])) > 1
        points.append((t, list(right), "empty"))
    if not has_color:
        return fail(500, "Вся последовательность серая: проверьте независимость R, G и B")
    return timeline(case, execution, points)
