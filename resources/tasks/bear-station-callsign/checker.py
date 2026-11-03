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
    for t in moments(execution, case["input"]["durationMs"]):
        phase = t % 5500
        on = phase < 500 or 1000 <= phase < 1500 or 2000 <= phase < 3500
        if not eyes_are(state_at(execution, t), "cyan" if on else "black"):
            return fail(t, "Нарушен позывной: проверьте длительности вспышек и пауз обоих глаз")
    return {"passed": True}
