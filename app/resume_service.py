import os
import re
from io import BytesIO

from docx import Document
from pypdf import PdfReader
from PIL import Image
import pytesseract


# --------------------------------------------------
# 1. Configure Tesseract OCR for Windows
# --------------------------------------------------

TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


# --------------------------------------------------
# 2. Skills supported by this version
# --------------------------------------------------

KNOWN_SKILLS = [
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data analysis",
    "data science",
    "scikit-learn",
    "spring boot",
    "javascript",
    "typescript",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "python",
    "java",
    "react",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "pandas",
    "numpy",
    "tensorflow",
    "pytorch",
    "excel",
    "power bi",
    "tableau",
    "docker",
    "git",
    "html",
    "css",
    "aws",
    "c++",
    "c#",
]


# --------------------------------------------------
# 3. Extract text from an image
# --------------------------------------------------

def extract_image_text(content: bytes) -> str:
    """
    Extract text from JPG, JPEG, or PNG resume images
    using Tesseract OCR.
    """

    try:
        with Image.open(BytesIO(content)) as original_image:
            image = original_image.convert("RGB")

        # Enlarge small images to help OCR read the text.
        if image.width < 1500:
            ratio = 1500 / image.width
            new_width = 1500
            new_height = int(image.height * ratio)

            image = image.resize(
                (new_width, new_height),
                Image.Resampling.LANCZOS,
            )

        # Read text from the image.
        extracted_text = pytesseract.image_to_string(
            image,
            config="--psm 6",
        )

        return extracted_text

    except pytesseract.TesseractNotFoundError as error:
        raise RuntimeError(
            "Tesseract OCR is not installed or could not be found. "
            "Please install Tesseract OCR and configure its path."
        ) from error

    except Exception as error:
        raise ValueError(
            "Could not read the resume image. "
            "Please upload a valid, clear JPG, JPEG, or PNG image."
        ) from error


# --------------------------------------------------
# 4. Extract text from PDF, DOCX, or image resumes
# --------------------------------------------------

def extract_resume_text(filename: str, content: bytes) -> str:
    """
    Extract text from a PDF, DOCX, JPG, JPEG, or PNG resume.
    """

    name = filename.lower().strip()

    if not content:
        raise ValueError("The uploaded resume is empty.")

    # Image resume
    if name.endswith((".png", ".jpg", ".jpeg")):
        return extract_image_text(content)

    # PDF resume
    if name.endswith(".pdf"):
        try:
            reader = PdfReader(BytesIO(content))

            if reader.is_encrypted:
                raise ValueError(
                    "Encrypted PDFs are not supported."
                )

            return "\n".join(
                page.extract_text() or ""
                for page in reader.pages
            )

        except ValueError:
            raise

        except Exception as error:
            raise ValueError(
                "Could not read the PDF resume."
            ) from error

    # DOCX resume
    if name.endswith(".docx"):
        try:
            document = Document(BytesIO(content))

            paragraphs = [
                paragraph.text
                for paragraph in document.paragraphs
            ]

            # Also extract text from tables.
            for table in document.tables:
                for row in table.rows:
                    paragraphs.extend(
                        cell.text for cell in row.cells
                    )

            return "\n".join(paragraphs)

        except Exception as error:
            raise ValueError(
                "Could not read the DOCX resume."
            ) from error

    raise ValueError(
        "Unsupported file format. "
        "Please upload a PDF, DOCX, JPG, JPEG, or PNG resume."
    )


# --------------------------------------------------
# 5. Extract known skills from resume text
# --------------------------------------------------

def extract_skills(text: str) -> list[str]:
    """
    Identify known skills mentioned in the extracted resume text.
    """

    normalized_text = text.lower()
    found_skills = []

    for skill in KNOWN_SKILLS:
        pattern = (
            r"(?<!\w)"
            + re.escape(skill.lower())
            + r"(?!\w)"
        )

        if re.search(pattern, normalized_text):
            found_skills.append(skill)

    return found_skills