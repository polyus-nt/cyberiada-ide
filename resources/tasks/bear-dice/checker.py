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

DICE = {1: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0], 3: [0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0], 4: [0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0], 5: [0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0], 6: [0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0, 0, 100, 0, 100, 0, 0, 0, 0, 0, 0]}
def check(case, execution):
    faces = {}
    for t in moments(execution, case["input"]["durationMs"]):
        state = state_at(execution, t)
        if t % 3000 < 500:
            if not eyes_are(state, "black") or not picture_is(state, "empty"):
                return fail(t, "В начале броска глаза и живот должны погаснуть на 500 мс")
            continue
        pattern = [v for row in state["matrix"] for v in row]
        face = next((n for n, p in DICE.items() if pattern == p), None)
        if face is None:
            return fail(t, "Матрица должна показывать одну из шести граней кубика")
        cycle = t // 3000
        draws = [e for e in execution["result"]["trace"] if e["kind"] == "random" and cycle * 3000 <= e["timeMs"] <= t]
        choices = [e["value"] for e in draws if e["begin"] == 1 and e["end"] == 7]
        if not choices or face not in choices:
            return fail(t, "Грань должна соответствовать случайному числу от 1 до 6 этого броска")
        if cycle in faces and faces[cycle] != face:
            return fail(t, "Грань изменилась внутри одного броска")
        faces[cycle] = face
        color = "red" if face == 1 else "green" if face == 6 else "white"
        if not eyes_are(state, color):
            return fail(t, "Цвет глаз не соответствует показанной грани")
    return {"passed": True}
