# Checker API v1: state_at, eyes_are, picture_is, COLORS, PICTURES are supplied by the interpreter.
def fail(time, message):
    return {"passed": False, "timeMs": time, "message": message}

def moments(execution, duration, regular=125):
    times = set(range(0, duration + 1, regular))
    for event in execution["result"]["trace"]:
        if event["kind"] == "state":
            t = event["timeMs"]
            times.update([max(0, t - 1), t, min(duration, t + 1)])
    return sorted(times)

def check(case, execution):
    row = col = 0
    expected = []
    for item in sorted(enumerate(case["input"]["inputs"]), key=lambda pair: (pair[1]["timeMs"], pair[0])):
        byte = item[1]
        if byte["channel"] == "ir":
            if byte["byte"] == 0: row = col = 0
            elif 1 <= byte["byte"] <= 4: row = byte["byte"]
        elif 1 <= byte["byte"] <= 4:
            col = byte["byte"]
        expected.append((byte["timeMs"], row, col))
    for t in moments(execution, case["input"]["durationMs"], 100):
        row = col = 0
        for at, r, c in expected:
            if at > t: break
            row, col = r, c
        state = state_at(execution, t)
        if not picture_is(state, ["empty", "square", "heart", "smile", "triangle"][row]):
            return fail(t, "Неверная половинка с ИК-канала или не погашена матрица")
        if not eyes_are(state, ["black", "red", "green", "blue", "yellow"][col]):
            return fail(t, "Неверная половинка с акустического канала или не погашены глаза")
    return {"passed": True}
