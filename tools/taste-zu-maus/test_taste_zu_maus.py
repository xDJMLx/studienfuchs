import unittest
from taste_zu_maus import HoldMapper


class FakeMouse:
    def __init__(self):
        self.events = []

    def press(self, b):
        self.events.append(("press", b))

    def release(self, b):
        self.events.append(("release", b))


class HoldMapperTest(unittest.TestCase):
    def setUp(self):
        self.m = FakeMouse()
        self.h = HoldMapper(self.m, "left")

    def test_press_and_release(self):
        self.h.press()
        self.h.release()
        self.assertEqual(self.m.events, [("press", "left"), ("release", "left")])

    def test_auto_repeat_presses_only_once(self):
        for _ in range(10):
            self.h.press()
        self.h.release()
        self.assertEqual(self.m.events, [("press", "left"), ("release", "left")])

    def test_release_without_press_does_nothing(self):
        self.h.release()
        self.assertEqual(self.m.events, [])

    def test_pause_while_held_releases_mouse(self):
        self.h.press()
        self.h.toggle()
        self.assertFalse(self.h.held)
        self.assertEqual(self.m.events[-1], ("release", "left"))

    def test_paused_does_not_press(self):
        self.h.toggle()
        self.h.press()
        self.assertEqual(self.m.events, [])
        self.h.toggle()
        self.h.press()
        self.assertEqual(self.m.events, [("press", "left")])


if __name__ == "__main__":
    unittest.main()
