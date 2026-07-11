FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy just the requirements first
COPY backend/requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code
COPY backend/ .

# Hugging Face requires servers to run on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]