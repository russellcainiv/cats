import sys
import time
from unittest.mock import patch
import publish_issues

def benchmark():
    mock_issues = [{'title': f'Issue {i}', 'number': i, 'id': i, 'html_url': f'http://example.com/{i}'} for i in range(50)]

    with patch('publish_issues.api', return_value=mock_issues) as mock_api:
        start_time = time.perf_counter()
        # Simulate calling existing() multiple times as done in verify() or registry()
        for _ in range(100):
            res = publish_issues.existing()
        elapsed = time.perf_counter() - start_time
        call_count = mock_api.call_count
        print(f"Calls to api: {call_count}")
        print(f"Elapsed time for 100 calls: {elapsed:.6f} seconds")
        return call_count, elapsed

if __name__ == '__main__':
    benchmark()
