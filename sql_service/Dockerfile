FROM python:3.12-slim
WORKDIR /service
COPY requirements-sql.txt .
RUN pip install --no-cache-dir -r requirements-sql.txt 'fastapi>=0.115,<1' 'uvicorn>=0.30,<1'
COPY app/__init__.py app/sql_database.py ./app/
COPY sql_service/main.py ./sql_service/main.py
CMD ["sh", "-c", "exec uvicorn sql_service.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
