import os
import sys
from io import BytesIO
from services.cv_service import extract_cv_data

# Mock PDF content creation not trivial without a library, 
# so we will check if a file path is provided, otherwise we mock the reading part or just fail gracefully.
# Usage: python test_cv_extraction.py <path_to_pdf>

def test_extraction(pdf_path):
    print(f"Testing extraction with: {pdf_path}")
    if not os.path.exists(pdf_path):
        print("File not found.")
        return

    with open(pdf_path, 'rb') as f:
        # We need to read it into a BytesIO to simulate file.stream from Flask
        file_stream = BytesIO(f.read())
        
    result = extract_cv_data(file_stream)
    print("\nExtraction Result:")
    print(result)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_cv_extraction.py <path_to_pdf>")
        print("Please provide a PDF file to test.")
    else:
        test_extraction(sys.argv[1])
