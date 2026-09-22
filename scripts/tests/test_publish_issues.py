import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
import sys

# Add scripts directory to path to import publish_issues
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from publish_issues import command

def test_command_success():
    with patch('subprocess.run') as mock_run:
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "success output"
        mock_run.return_value = mock_result

        result = command(['echo', 'hello'])

        assert result == "success output"
        mock_run.assert_called_once()

def test_command_failure():
    with patch('subprocess.run') as mock_run:
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = "error out"
        mock_result.stderr = " error err"
        mock_run.return_value = mock_result

        with pytest.raises(RuntimeError) as exc_info:
            command(['false'])

        assert "error out error err" in str(exc_info.value)
        mock_run.assert_called_once()

def test_command_failure_truncation():
    with patch('subprocess.run') as mock_run:
        mock_result = MagicMock()
        mock_result.returncode = 1
        # Create output longer than 1800 chars
        mock_result.stdout = "a" * 1000
        mock_result.stderr = "b" * 1000
        mock_run.return_value = mock_result

        with pytest.raises(RuntimeError) as exc_info:
            command(['false'])

        error_msg = str(exc_info.value)
        assert len(error_msg) == 1800
        assert error_msg == ("a" * 1000 + "b" * 1000)[-1800:]
        mock_run.assert_called_once()
