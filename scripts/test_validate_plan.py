import sys
import os
import io
import unittest
from unittest.mock import patch

# Add the scripts directory to the python path so it can import validate_plan
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import validate_plan

class TestValidatePlan(unittest.TestCase):
    def test_main_error_path_value_error(self):
        """Test that main() catches ValueError and returns 1."""
        with patch('sys.argv', ['validate_plan.py', 'handoff']):
            with patch('validate_plan.handoff', side_effect=ValueError("mocked error")):
                # Suppress stderr output during test
                with patch('sys.stderr', new_callable=io.StringIO):
                    self.assertEqual(validate_plan.main(), 1)

    def test_main_error_path_assertion_error(self):
        """Test that main() catches AssertionError and returns 1."""
        with patch('sys.argv', ['validate_plan.py', 'handoff']):
            with patch('validate_plan.handoff', side_effect=AssertionError("mocked error")):
                # Suppress stderr output during test
                with patch('sys.stderr', new_callable=io.StringIO):
                    self.assertEqual(validate_plan.main(), 1)

    def test_main_error_path_key_error(self):
        """Test that main() catches KeyError and returns 1 for invalid mode."""
        with patch('sys.argv', ['validate_plan.py', 'invalid_mode']):
            # Suppress stderr output during test
            with patch('sys.stderr', new_callable=io.StringIO):
                self.assertEqual(validate_plan.main(), 1)

    def test_main_success_path(self):
        """Test that main() returns 0 for a successful run."""
        with patch('sys.argv', ['validate_plan.py', 'self-test']):
            # Suppress stdout output during test
            with patch('sys.stdout', new_callable=io.StringIO):
                self.assertEqual(validate_plan.main(), 0)

if __name__ == '__main__':
    unittest.main()
