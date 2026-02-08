import os
from google import genai
from PyPDF2 import PdfReader
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_gemini():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables")
        return None
    return genai.Client(api_key=api_key)

def extract_text_from_pdf(file_stream):
    try:
        reader = PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        return None

def extract_cv_data(file_stream):
    """
    Extracts structured data from a CV file stream using Gemini.
    Returns a JSON object with the extracted fields.
    """

    client = setup_gemini()
    if not client:
        return {"error": "Gemini API not configured"}

    text_content = extract_text_from_pdf(file_stream)
    if not text_content:
        return {"error": "Could not extract text from PDF"}

    prompt = f"""
    You are an expert resume parser. Extract the following information from the provided resume text into a strict JSON format.
    
    Resume Text:
    {text_content}

    Required keys and format:
    {{
        "firstName": "String",
        "lastName": "String",
        "email": "String (if found, else null)",
        "graduationYear": "Integer (or null)",
        "faculty": "String (e.g., 'Faculty of Science', or null)",
        "major": "String (e.g., 'Computer Science', or null)",
        "minor": "String (or null)",
        "clubs": ["List of extracted club names or student organizations"],
        "experience": [
            {{
                "position": "String",
                "company": "String",
                "dates": "String (e.g., 'May 2023 - Aug 2023')",
                "location": "String"
            }}
        ],
        "linkedinUrl": "String (full URL if found, else null)",
        "portfolioUrl": "String (Github/Personal Site, else null)"
    }}

    Return ONLY the JSON. Do not include markdown formatting like ```json ... ```.
    """

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt
        )
        # Clean up code blocks if Gemini returns them despite instructions
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw_text)
        return data
    except Exception as e:
        logger.error(f"Error calling Gemini or parsing response: {e}")
        return {"error": f"Failed to process CV: {str(e)}"}
