import json
import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Ensure we can import validate_plan
sys.path.insert(0, os.path.dirname(__file__))
import validate_plan

class TestValidatePlan(unittest.TestCase):
    @patch('validate_plan.Path.is_file')
    @patch('validate_plan.Path.read_text')
    def test_read_success(self, mock_read_text, mock_is_file):
        mock_is_file.return_value = True
        mock_read_text.return_value = "file content"
        content = validate_plan.read('dummy.txt')
        self.assertEqual(content, "file content")
        mock_is_file.assert_called_once()
        mock_read_text.assert_called_once()

    @patch('validate_plan.Path.is_file')
    def test_read_missing(self, mock_is_file):
        mock_is_file.return_value = False
        with self.assertRaises(AssertionError) as context:
            validate_plan.read('missing.txt')
        self.assertIn("Missing file:", str(context.exception))

    def test_graph_errors_empty(self):
        errors = validate_plan.graph_errors([], [])
        self.assertEqual(errors, [])

    def test_graph_errors_duplicate_id(self):
        tickets = [
            {'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [], 'requirements': []},
            {'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [], 'requirements': []}
        ]
        errors = validate_plan.graph_errors(tickets, [])
        self.assertIn('duplicate ticket ID', errors)

    def test_graph_errors_missing_criteria(self):
        tickets = [{'id': 1, 'criteria': ['a', 'b'], 'depends': [], 'requirements': []}]
        errors = validate_plan.graph_errors(tickets, [])
        self.assertIn('ticket 1 lacks acceptance criteria', errors)

        tickets2 = [{'id': 2, 'depends': [], 'requirements': []}]
        errors2 = validate_plan.graph_errors(tickets2, [])
        self.assertIn('ticket 2 lacks acceptance criteria', errors2)

    def test_graph_errors_missing_dependency(self):
        tickets = [{'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [99], 'requirements': []}]
        errors = validate_plan.graph_errors(tickets, [])
        self.assertIn('ticket 1 missing dependency 99', errors)

    def test_graph_errors_unordered_dependency(self):
        tickets = [
            {'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [2], 'requirements': []},
            {'id': 2, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [], 'requirements': []}
        ]
        errors = validate_plan.graph_errors(tickets, [])
        self.assertIn('ticket 1 not in dependency order', errors)

    def test_graph_errors_unknown_requirement(self):
        tickets = [{'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [], 'requirements': ['R99']}]
        reqs = [{'id': 'R1'}]
        errors = validate_plan.graph_errors(tickets, reqs)
        self.assertIn('unknown requirement R99', errors)

    def test_graph_errors_uncovered_requirement(self):
        tickets = [{'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [], 'requirements': []}]
        reqs = [{'id': 'R1'}]
        errors = validate_plan.graph_errors(tickets, reqs)
        self.assertIn('uncovered requirement R1', errors)

    def test_graph_errors_dependency_cycle(self):
        tickets = [
            {'id': 1, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [2], 'requirements': []},
            {'id': 2, 'criteria': ['a', 'b', 'c', 'd'], 'depends': [1], 'requirements': []}
        ]
        errors = validate_plan.graph_errors(tickets, [])
        self.assertIn('dependency cycle', errors)

    @patch('validate_plan.read')
    def test_load(self, mock_read):
        mock_read.side_effect = [
            json.dumps([{"id": "R1"}]),
            json.dumps({"tickets": [{"id": 1}]})
        ]
        reqs, tickets = validate_plan.load()
        self.assertEqual(reqs, [{"id": "R1"}])
        self.assertEqual(tickets, [{"id": 1}])
        self.assertEqual(mock_read.call_count, 2)

    @patch('validate_plan.load')
    @patch('validate_plan.read')
    def test_requirements_success(self, mock_read, mock_load):
        # Must have 32 requirements
        reqs = [{'id': f'R{i}', 'title': 'T', 'decision': 'D'} for i in range(1, 33)]
        tickets = [{'id': 1, 'criteria': ['a','b','c','d'], 'depends': [], 'requirements': [f'R{i}' for i in range(1, 33)]}]
        mock_load.return_value = (reqs, tickets)

        spec_text = " ".join([f"R{i}" for i in range(1, 33)])
        mock_read.return_value = spec_text

        # Should pass without assertion errors
        validate_plan.requirements()

    @patch('validate_plan.load')
    def test_requirements_wrong_count(self, mock_load):
        mock_load.return_value = ([], [])
        with self.assertRaises(AssertionError) as context:
            validate_plan.requirements()
        self.assertIn("Confirmed decision ledger changed", str(context.exception))

    @patch('validate_plan.load')
    @patch('validate_plan.read')
    def test_requirements_missing_in_spec(self, mock_read, mock_load):
        reqs = [{'id': f'R{i:02d}', 'title': 'T', 'decision': 'D'} for i in range(1, 33)]
        mock_load.return_value = (reqs, [])
        # R01 is missing from spec text
        spec_text = " ".join([f"R{i:02d}" for i in range(2, 33)])
        mock_read.return_value = spec_text

        with self.assertRaises(AssertionError) as context:
            validate_plan.requirements()
        self.assertIn("Spec missing R01", str(context.exception))


    @patch('validate_plan.read')
    def test_spec_success(self, mock_read):
        def dummy_read(name):
            if name == '.scratch/cats/spec.md':
                return """
## Problem Statement
## Solution
## User Stories
1. As a cat, I want food, so that I can eat.
""" + "".join([f"{i}. As a user, I want X, so that Y.\n" for i in range(2, 41)]) + """
## Implementation Decisions
## Testing Decisions
## Out of Scope
## Further Notes
Moo-Moo proposed eight ghost free-build
approved-direction.png
"""
            return "x" * 501  # For the other docs

        mock_read.side_effect = dummy_read
        validate_plan.spec()

    @patch('validate_plan.read')
    def test_spec_missing_heading(self, mock_read):
        mock_read.return_value = "Missing headings"
        with self.assertRaises(AssertionError) as context:
            validate_plan.spec()
        self.assertIn("Problem Statement", str(context.exception))

    @patch('validate_plan.load')
    @patch('validate_plan.Path.glob')
    @patch('validate_plan.read')
    def test_tickets_success(self, mock_read, mock_glob, mock_load):
        # Setup dummy data for tickets
        reqs = [{'id': 'R1'}]
        data = [{'id': 1, 'slug': 'test', 'criteria': ['Crit 1', 'Crit 2', 'Crit 3', 'Crit 4'], 'depends': [], 'requirements': ['R1']}]
        mock_load.return_value = (reqs, data)

        # Mock glob to return one dummy file
        mock_path = MagicMock()
        mock_glob.return_value = [mock_path]

        # Mock read to return dummy ticket content
        mock_read.return_value = """
**What to build:**
**Blocked by:**
**Status:** ready-for-agent
## Acceptance criteria
- [ ] Crit 1
- [ ] Crit 2
- [ ] Crit 3
- [ ] Crit 4
## Verification
independent blind review
"""
        validate_plan.tickets()

    @patch('validate_plan.load')
    @patch('validate_plan.Path.glob')
    def test_tickets_file_mismatch(self, mock_glob, mock_load):
        reqs = [{'id': 'R1'}]
        data = [{'id': 1, 'slug': 'test', 'criteria': ['C1', 'C2', 'C3', 'C4'], 'depends': [], 'requirements': ['R1']}]
        mock_load.return_value = (reqs, data)
        # 0 files found
        mock_glob.return_value = []
        with self.assertRaises(AssertionError) as context:
            validate_plan.tickets()
        self.assertIn("Manifest/file mismatch", str(context.exception))


    @patch('validate_plan.load')
    @patch('validate_plan.read')
    @patch('validate_plan.Path.read_bytes')
    @patch('validate_plan.Path.exists')
    @patch('validate_plan.hashlib.sha256')
    def test_handoff_success(self, mock_sha256, mock_exists, mock_read_bytes, mock_read, mock_load):
        # Setup data
        reqs = []
        data = [{'id': 1, 'title': 'Test Task', 'slug': 'test-task'}]
        mock_load.return_value = (reqs, data)

        # Setup read_bytes and hash
        mock_read_bytes.return_value = b'\x89PNG\r\n\x1a\nfakeimage'
        mock_hasher = MagicMock()
        mock_hasher.hexdigest.return_value = 'fakehash'
        mock_sha256.return_value = mock_hasher

        # Setup exists (for broken links check)
        mock_exists.return_value = True

        def dummy_read(name):
            if name == 'docs/superpowers/plans/2026-09-20-cats.md':
                return "### Task 01: Test Task\ntests/e2e/test-task.spec.ts\napproved-direction.png\nNo particular model"
            if name == 'docs/art/approved-direction.sha256':
                return "fakehash\n"
            if name == 'README.md':
                return "approved-direction.png\n" + ("x" * 200)
            return "x" * 201

        mock_read.side_effect = dummy_read

        validate_plan.handoff()

    @patch('validate_plan.load')
    @patch('validate_plan.read')
    @patch('validate_plan.Path.read_bytes')
    def test_handoff_bad_image(self, mock_read_bytes, mock_read, mock_load):
        mock_load.return_value = ([], [])
        mock_read.return_value = "x" * 201

        mock_read_bytes.return_value = b'badheader'

        with self.assertRaises(AssertionError) as context:
            validate_plan.handoff()

        self.assertFalse(str(context.exception).startswith('Approved picture changed')) # Fails on startswith check before hash check

    @patch('validate_plan.load')
    def test_self_test(self, mock_load):
        reqs = [{'id': 'R25'}]
        data = [{'id': 1, 'slug': 't', 'criteria': ['a','b','c','d'], 'depends': [], 'requirements': ['R25']},
                {'id': 2, 'slug': 'u', 'criteria': ['a','b','c','d'], 'depends': [1], 'requirements': []}]
        mock_load.return_value = (reqs, data)

        validate_plan.self_test()

    @patch('validate_plan.sys.argv', ['validate_plan.py', 'all'])
    @patch('validate_plan.requirements')
    @patch('validate_plan.spec')
    @patch('validate_plan.tickets')
    @patch('validate_plan.handoff')
    @patch('validate_plan.self_test')
    def test_main_all(self, mock_st, mock_h, mock_t, mock_s, mock_r):
        self.assertEqual(validate_plan.main(), 0)
        mock_r.assert_called_once()
        mock_s.assert_called_once()
        mock_t.assert_called_once()
        mock_h.assert_called_once()
        mock_st.assert_called_once()

    @patch('validate_plan.sys.argv', ['validate_plan.py', 'spec'])
    @patch('validate_plan.spec')
    def test_main_specific(self, mock_spec):
        self.assertEqual(validate_plan.main(), 0)
        mock_spec.assert_called_once()

    @patch('validate_plan.sys.argv', ['validate_plan.py', 'invalid'])
    def test_main_invalid(self):
        self.assertEqual(validate_plan.main(), 1)

if __name__ == '__main__':
    unittest.main()
