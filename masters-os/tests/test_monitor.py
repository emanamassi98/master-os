from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from monitor import parse_snapshot, collect_events, run

SOURCE = {'id': 'award', 'title': 'Test Sanctuary', 'url': 'https://example.edu/scholarships/', 'kind': 'scholarship', 'type': 'detail'}

class MonitoringTests(unittest.TestCase):
    def snapshot(self, text):
        return parse_snapshot(text, SOURCE['url'], 2027)

    def test_old_round_not_reported_as_new(self):
        s = self.snapshot('<h1>Sanctuary Scholarship 2026/27</h1><p>Applications are open</p>')
        self.assertEqual(s['signals'], [])
        self.assertEqual(collect_events(SOURCE, None, s, 2027, 'now'), [])

    def test_footer_year_does_not_make_old_round_current(self):
        s = self.snapshot('<h1>Scholarship 2026/27</h1><p>Applications now open</p><footer>Copyright 2027</footer>')
        self.assertEqual(s['signals'], [])

    def test_old_full_year_cycle_is_not_a_2027_intake(self):
        s = self.snapshot('<h1>Sanctuary Scholarship 2026/2027</h1><p>Applications now open</p>')
        self.assertEqual(s['signals'], [])
        s = self.snapshot('<a href="/sanctuary-2026-2027">Sanctuary 2026/2027</a>')
        self.assertEqual(collect_events({**SOURCE, 'type': 'directory'}, None, s, 2027, 'now'), [])

    def test_unrelated_directory_awards_do_not_create_funding_alerts(self):
        s = self.snapshot('<h1>Music Awards for January 2027</h1><p>Postgraduate applications are open</p>')
        self.assertEqual(collect_events({**SOURCE, 'type': 'directory'}, None, s, 2027, 'now'), [])

    def test_new_year_closed_round_not_reported_open(self):
        s = self.snapshot('<h1>Sanctuary Scholarship 2027/28</h1><p>Applications are now closed.</p>')
        self.assertEqual(s['signals'], [])

    def test_future_planned_opening_not_reported_open(self):
        s = self.snapshot('<h1>Sanctuary Scholarship 2027/28</h1><p>Applications will open in November.</p>')
        self.assertEqual(s['signals'], [])

    def test_new_round_detected_once(self):
        s = self.snapshot('<h1>Sanctuary Scholarship 2027/28</h1><p>Applications are now open.</p>')
        events = collect_events(SOURCE, None, s, 2027, 'now')
        self.assertEqual(events[0]['kind'], 'possible_opening')
        self.assertEqual(collect_events(SOURCE, s, s, 2027, 'later'), [])

    def test_new_directory_link_requires_explicit_new_year(self):
        source = {**SOURCE, 'type': 'directory'}
        s = self.snapshot('<a href="/award-2026">Sanctuary 2026</a><a href="/award-2027">Sanctuary 2027/28</a>')
        events = collect_events(source, None, s, 2027, 'now')
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]['url'], 'https://example.edu/award-2027')

    def test_failures_preserve_baseline_and_success_timestamp(self):
        previous = {'sources': {'award': {'fingerprint': 'good', 'links': {}, 'signals': [], 'checkedAt': 'yesterday'}}, 'events': [], 'lastSuccessfulRun': 'yesterday'}
        def fail(url): raise RuntimeError('HTTP 403')
        report, events = run({'targetYear': 2027, 'sources': [SOURCE]}, previous, fail)
        self.assertEqual(report['sources']['award']['fingerprint'], 'good')
        self.assertEqual(report['lastSuccessfulRun'], 'yesterday')
        self.assertEqual(events, [])
        self.assertEqual(len(report['errors']), 1)

    def test_first_course_run_is_a_baseline(self):
        source = {**SOURCE, 'kind': 'course'}
        s = self.snapshot('<h1>Software Engineering Masters 2027</h1><p>Applications now open</p>')
        self.assertEqual(collect_events(source, None, s, 2027, 'now'), [])

if __name__ == '__main__': unittest.main()
