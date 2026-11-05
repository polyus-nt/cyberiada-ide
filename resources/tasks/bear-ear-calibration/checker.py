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


def check(case, execution):
    colors = ['red', 'green', 'black']
    points = [(0, "black", "empty")]
    for event in inputs(case):
        if event["channel"] == "ears":
            points.append((event["timeMs"], colors[event["byte"] % 3], "empty"))
    return timeline(case, execution, points)
