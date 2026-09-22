import json
import unittest
from unittest.mock import patch, MagicMock, call
import importlib.util
import sys
from pathlib import Path

# Dynamically load the module since it's a script
spec = importlib.util.spec_from_file_location("publish_issues", str(Path(__file__).resolve().parent / "publish_issues.py"))
publish_issues = importlib.util.module_from_spec(spec)
sys.modules["publish_issues"] = publish_issues
spec.loader.exec_module(publish_issues)

class TestPublishIssues(unittest.TestCase):

    def setUp(self):
        self.mock_manifest = {
            "tickets": [
                {
                    "id": 1,
                    "slug": "private-household",
                    "title": "Create and resume a private saved household",
                    "depends": []
                },
                {
                    "id": 2,
                    "slug": "playable-home",
                    "title": "Select and move an animated cat in the approved world",
                    "depends": [1]
                }
            ]
        }

    @patch("publish_issues.subprocess.run")
    def test_command_success(self, mock_run):
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "success_output"
        mock_run.return_value = mock_result

        result = publish_issues.command(["echo", "hello"])
        self.assertEqual(result, "success_output")
        mock_run.assert_called_once_with(["echo", "hello"], cwd=publish_issues.ROOT, capture_output=True, text=True)

    @patch("publish_issues.subprocess.run")
    def test_command_failure(self, mock_run):
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = "stdout_err"
        mock_result.stderr = "stderr_err"
        mock_run.return_value = mock_result

        with self.assertRaisesRegex(RuntimeError, "stdout_errstderr_err"):
            publish_issues.command(["fail"])

    @patch("publish_issues.command")
    def test_api(self, mock_command):
        mock_command.return_value = '{"data": "value"}'
        result = publish_issues.api("some/path", "--arg1", "val1")
        self.assertEqual(result, {"data": "value"})
        mock_command.assert_called_once_with(["gh", "api", "some/path", "--arg1", "val1"])

    @patch("publish_issues.api")
    def test_existing(self, mock_api):
        mock_api.return_value = [
            {"title": "Issue 1", "number": 1, "pull_request": {}},  # PR, should be skipped
            {"title": "Issue 2", "number": 2},                      # Normal issue
        ]
        result = publish_issues.existing()
        self.assertEqual(result, {"Issue 2": {"title": "Issue 2", "number": 2}})
        mock_api.assert_called_once_with(f"repos/{publish_issues.REPO}/issues?state=all&per_page=100")

    @patch("pathlib.Path.read_text")
    def test_specs(self, mock_read_text):
        # We test that the specs function correctly reads the file and produces the expected length
        # of items depending on what read_text returns.
        mock_read_text.return_value = json.dumps(self.mock_manifest)

        specs = publish_issues.specs()
        # 1 for spec + 2 manifest items + 1 for map + 3 for map children = 7 total specs
        self.assertEqual(len(specs), 7)

        self.assertEqual(specs[0]["key"], "spec")
        self.assertEqual(specs[1]["key"], "task-01")
        self.assertEqual(specs[1]["labels"], ['kind:feature', 'ready-for-agent', 'area:platform', 'priority:high'])
        self.assertEqual(specs[2]["key"], "task-02")
        self.assertEqual(specs[2]["labels"], ['kind:feature', 'ready-for-agent', 'area:simulation', 'priority:normal'])
        self.assertEqual(specs[3]["key"], "map")
        self.assertEqual(specs[4]["key"], "01-recipient")

    @patch("publish_issues.time.sleep")
    @patch("publish_issues.command")
    @patch("publish_issues.specs")
    @patch("publish_issues.existing")
    def test_create(self, mock_existing, mock_specs, mock_command, mock_sleep):
        mock_existing.return_value = {
            "Existing Issue": {"number": 1}
        }
        mock_specs.return_value = [
            {"key": "task-01", "title": "Existing Issue", "body": "body1", "labels": ["label1"]},
            {"key": "task-02", "title": "New Issue", "body": "body2", "labels": ["label2"]},
        ]

        publish_issues.create()

        # command should only be called for the new issue
        # Note: the script hardcodes '/opt/homebrew/bin/gh-axi', so we must check for that.
        args = [mock_command.call_args[0][0][0], 'issue', 'create', '--repo', publish_issues.REPO, '--title', 'New Issue', '--body-file', 'body2', '--label', 'label2']
        mock_command.assert_called_once_with(args)
        mock_sleep.assert_called_once_with(1)

    @patch("publish_issues.existing")
    @patch("publish_issues.specs")
    def test_registry_success(self, mock_specs, mock_existing):
        mock_specs.return_value = [{"key": "spec", "title": "Spec title"}]
        mock_existing.return_value = {"Spec title": {"number": 1, "id": 100, "html_url": "url", "title": "Spec title"}}

        registry = publish_issues.registry()
        self.assertEqual(registry["repository"], publish_issues.BASE)
        self.assertEqual(registry["github"]["spec"]["number"], 1)

    @patch("publish_issues.existing")
    @patch("publish_issues.specs")
    def test_registry_missing(self, mock_specs, mock_existing):
        mock_specs.return_value = [{"key": "spec", "title": "Spec title"}]
        mock_existing.return_value = {}

        with self.assertRaisesRegex(RuntimeError, "Missing spec"):
            publish_issues.registry()

    @patch("publish_issues.time.sleep")
    @patch("publish_issues.api")
    @patch("pathlib.Path.read_text")
    @patch("publish_issues.registry")
    def test_relations(self, mock_registry, mock_read_text, mock_api, mock_sleep):
        mock_registry.return_value = {
            "github": {
                "spec": {"number": 1},
                "task-01": {"number": 2, "id": 200},
                "task-02": {"number": 3, "id": 300},
                "map": {"number": 4},
                "01-recipient": {"number": 5, "id": 500},
                "02-balance": {"number": 6, "id": 600},
                "03-phone-art": {"number": 7, "id": 700}
            }
        }
        mock_read_text.return_value = json.dumps(self.mock_manifest)

        # mock API response for existing sub issues / dependencies
        def mock_api_side_effect(path, *args):
            if path == f'repos/{publish_issues.REPO}/issues/1/sub_issues':
                return [{"id": 200}]  # task-01 is already a sub issue
            if path == f'repos/{publish_issues.REPO}/issues/4/sub_issues':
                return []
            if path == f'repos/{publish_issues.REPO}/issues/3/dependencies/blocked_by':
                return []
            if path == f'repos/{publish_issues.REPO}/issues/2/dependencies/blocked_by':
                return []
            return []

        mock_api.side_effect = mock_api_side_effect

        publish_issues.relations()

        # Expected API calls for missing sub-issues
        # spec -> task-02 (since task-01 is already there)
        mock_api.assert_any_call(f'repos/{publish_issues.REPO}/issues/1/sub_issues', '-X', 'POST', '-F', 'sub_issue_id=300')
        # map -> 01-recipient, 02-balance, 03-phone-art
        mock_api.assert_any_call(f'repos/{publish_issues.REPO}/issues/4/sub_issues', '-X', 'POST', '-F', 'sub_issue_id=500')

        # Expected API calls for missing dependencies
        # task-02 blocked by task-01
        mock_api.assert_any_call(f'repos/{publish_issues.REPO}/issues/3/dependencies/blocked_by', '-X', 'POST', '-F', 'issue_id=200')

    @patch("publish_issues.api")
    @patch("publish_issues.registry")
    @patch("publish_issues.existing")
    @patch("publish_issues.specs")
    def test_verify_success(self, mock_specs, mock_existing, mock_registry, mock_api):
        mock_specs.return_value = [
            {"key": "spec", "title": "Spec title", "labels": ["label1"], "body": "path/body.md"}
        ]

        mock_existing.return_value = {
            "Spec title": {
                "labels": [{"name": "label1"}, {"name": "label2"}],
                "state": "open",
                "body": "body content\n"
            }
        }

        mock_registry.return_value = {
            "github": {
                "spec": {"number": 1, "id": 100},
                "task-01": {"number": 2, "id": 200},
                "task-02": {"number": 3, "id": 300},
                "map": {"number": 4, "id": 400},
                "01-recipient": {"number": 5, "id": 500},
                "02-balance": {"number": 6, "id": 600},
                "03-phone-art": {"number": 7, "id": 700}
            }
        }

        with patch('pathlib.Path.read_text', autospec=True) as mock_read_text:
            # When read_text is called on a path
            def read_text_side_effect(self_obj):
                if "path/body.md" in str(self_obj):
                    return "body content\n"
                return json.dumps(self.mock_manifest)

            mock_read_text.side_effect = read_text_side_effect

            def mock_api_side_effect(path, *args):
                if path == f'repos/{publish_issues.REPO}/issues/1/sub_issues?per_page=100':
                    return [{"id": 200}, {"id": 300}]
                if path == f'repos/{publish_issues.REPO}/issues/4/sub_issues?per_page=100':
                    return [{"id": 500}, {"id": 600}, {"id": 700}]
                if path == f'repos/{publish_issues.REPO}/issues/2/dependencies/blocked_by?per_page=100':
                    return []
                if path == f'repos/{publish_issues.REPO}/issues/3/dependencies/blocked_by?per_page=100':
                    return [{"id": 200}]
                return []

            mock_api.side_effect = mock_api_side_effect

            # Verify should pass without asserting
            try:
                publish_issues.verify()
            except AssertionError as e:
                self.fail(f"verify() raised AssertionError unexpectedly: {e}")

    @patch("publish_issues.api")
    @patch("publish_issues.registry")
    @patch("publish_issues.existing")
    @patch("publish_issues.specs")
    def test_verify_failure_state(self, mock_specs, mock_existing, mock_registry, mock_api):
        mock_specs.return_value = [{"key": "spec", "title": "Spec title", "labels": ["label1"], "body": "path/body.md"}]
        mock_existing.return_value = {
            "Spec title": {
                "labels": [{"name": "label1"}],
                "state": "closed",  # Should cause failure
                "body": "body content\n"
            }
        }
        mock_registry.return_value = {
            "github": {
                "spec": {"number": 1, "id": 100},
                "task-01": {"number": 2, "id": 200},
                "task-02": {"number": 3, "id": 300},
                "map": {"number": 4, "id": 400},
                "01-recipient": {"number": 5, "id": 500},
                "02-balance": {"number": 6, "id": 600},
                "03-phone-art": {"number": 7, "id": 700}
            }
        }
        with patch('pathlib.Path.read_text', autospec=True) as mock_read_text:
            def read_text_side_effect(self_obj):
                if "path/body.md" in str(self_obj):
                    return "body content\n"
                return json.dumps(self.mock_manifest)

            mock_read_text.side_effect = read_text_side_effect

            with self.assertRaises(AssertionError) as context:
                publish_issues.verify()

            self.assertIn("premature closure", str(context.exception))

if __name__ == '__main__':
    unittest.main()
