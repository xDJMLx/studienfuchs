import time
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

    def test_failed_press_does_not_stay_held(self):
        class Broken(FakeMouse):
            def press(self, b):
                raise OSError("kein Zugriff")

        h = HoldMapper(Broken(), "left")
        with self.assertRaises(OSError):
            h.press()
        self.assertFalse(h.held)

    def test_delay_waits_before_mouse_event(self):
        for delay_ms in (0.1, 5.0):
            stamps = []

            class Timed(FakeMouse):
                def press(self, b):
                    stamps.append(time.perf_counter())

            h = HoldMapper(Timed(), "left", delay_ms=delay_ms)
            start = time.perf_counter()
            h.press()
            self.assertGreaterEqual(stamps[0] - start, delay_ms / 1000.0 * 0.95)

    def test_delay_is_capped(self):
        self.assertEqual(HoldMapper(FakeMouse(), "left", delay_ms=9999).delay_s, 0.05)
        self.assertEqual(HoldMapper(FakeMouse(), "left", delay_ms=-3).delay_s, 0.0)


if __name__ == "__main__":
    unittest.main()
