"""Build/deploy only the account API, excluding runtime data and local secrets."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', default='puyadao-75dd0')
    parser.add_argument('--region', default='asia-east1')
    parser.add_argument('--instance', default='puyadao-postgresql')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    gcloud = os.environ.get('GCLOUD') or shutil.which('gcloud')
    if not gcloud:
        raise SystemExit('Set GCLOUD to the authenticated Google Cloud CLI executable.')
    with tempfile.TemporaryDirectory(prefix='puyadao-data-deploy-') as directory:
        stage = Path(directory)
        for name in ('app/__init__.py', 'app/sql_database.py', 'app/relational_schema.py',
                     'app/relational_storage.py', 'app/relational_v1_storage.py', 'sql_service/main.py',
                     'sql_service/content.py', 'sql_service/content_schema.py', 'sql_service/catalog_seed.json',
                     'requirements-sql.txt'):
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / name, target)
        shutil.copy2(root / 'sql_service/Dockerfile', stage / 'Dockerfile')
        subprocess.run([
            gcloud, 'run', 'deploy', 'puyadao-data', '--source', str(stage),
            '--project', args.project, '--region', args.region,
            '--service-account', f'puyadao-data@{args.project}.iam.gserviceaccount.com',
            '--build-service-account', f'projects/{args.project}/serviceAccounts/puyadao-build@{args.project}.iam.gserviceaccount.com',
            '--allow-unauthenticated', '--set-env-vars',
            f'INSTANCE_CONNECTION_NAME={args.project}:{args.region}:{args.instance},'
            f'DB_USER=puyadao-data@{args.project}.iam,DB_NAME=puyadao,DB_IAM_AUTH=true',
            '--memory', '512Mi', '--cpu', '1', '--min-instances', '0', '--max-instances', '2',
            '--concurrency', '40', '--timeout', '60', '--quiet',
        ], check=True)


if __name__ == '__main__':
    main()
