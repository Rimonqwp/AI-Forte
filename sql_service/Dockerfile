FROM python:3.12-slim
WORKDIR /service
COPY requirements-sql.txt .
RUN pip install --no-cache-dir -r requirements-sql.txt 'fastapi>=0.115,<1' 'uvicorn>=0.30,<1'
COPY app/__init__.py app/sql_database.py app/relational_schema.py app/relational_storage.py app/relational_v1_storage.py ./app/
COPY sql_service/main.py sql_service/content.py sql_service/content_schema.py sql_service/catalog_seed.json ./sql_service/
CMD ["sh", "-c", "exec uvicorn sql_service.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
