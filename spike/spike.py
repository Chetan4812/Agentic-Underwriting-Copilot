import os
import sys

# Add the current directory to sys.path so we can import retrieval_spike
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import retrieval_spike

if __name__ == "__main__":
    retrieval_spike.main()
