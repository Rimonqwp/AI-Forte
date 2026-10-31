"""Portable deployment: python scripts/deploy_song.py PROJECT --region REGION.

Creates isolated v2 resources; never updates the existing Cloud Run service.
"""
import argparse
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    p = argparse.ArgumentParser()
    p.add_argument('project')
    p.add_argument('--region', default='asia-southeast1')
    p.add_argument('--write-env', action='store_true')
    p.add_argument('--muscriptor-model', choices=('small', 'medium', 'large'), default='large')
    p.add_argument('--hf-secret', default='muscriptor-hf-token',
                   help='Secret Manager secret holding a Hugging Face read token with the MuScriptor license accepted')
    args = p.parse_args()
    gcloud = shutil.which('gcloud.cmd') or shutil.which('gcloud')
    if not gcloud: raise SystemExit('Install and sign in to Google Cloud CLI first.')
    def run(*cmd, capture=False, check=True):
        r = subprocess.run([gcloud, *cmd, '--project', args.project, '--quiet'],
                           cwd=ROOT, capture_output=capture, text=True, check=check)
        return r.stdout.strip() if capture else r.returncode
    project, region = args.project, args.region
    bucket = f'{project}-melody-song-v2'
    account = f'melody-song@{project}.iam.gserviceaccount.com'
    builder = f'melody-build@{project}.iam.gserviceaccount.com'
    resource = f'projects/{project}/locations/{region}/jobs/melody-song-v2'
    image = f'{region}-docker.pkg.dev/{project}/melody-song/worker:v2'
    run('services', 'enable', 'run.googleapis.com', 'cloudbuild.googleapis.com', 'artifactregistry.googleapis.com', 'storage.googleapis.com', 'secretmanager.googleapis.com')
    if run('secrets', 'describe', args.hf_secret, check=False):
        raise SystemExit(f'Accept the license at https://huggingface.co/MuScriptor/muscriptor-{args.muscriptor_model}, '
                         f'then store a read token: gcloud secrets create {args.hf_secret} --data-file=- --project {project}')
    for name, email in [('melody-song', account), ('melody-build', builder)]:
        if run('iam', 'service-accounts', 'describe', email, check=False):
            run('iam', 'service-accounts', 'create', name)
    run('projects', 'add-iam-policy-binding', project, '--member', f'serviceAccount:{builder}', '--role', 'roles/run.builder', '--condition=None')
    run('secrets', 'add-iam-policy-binding', args.hf_secret, '--member', f'serviceAccount:{builder}', '--role', 'roles/secretmanager.secretAccessor')
    if run('storage', 'buckets', 'describe', f'gs://{bucket}', check=False):
        run('storage', 'buckets', 'create', f'gs://{bucket}', '--location', region, '--uniform-bucket-level-access', '--public-access-prevention')
    with tempfile.TemporaryDirectory() as tmp:
        lifecycle = Path(tmp)/'lifecycle.json'
        lifecycle.write_text(json.dumps({'rule': [{'action': {'type': 'Delete'}, 'condition': {'age': 7}}]}))
        run('storage', 'buckets', 'update', f'gs://{bucket}', '--lifecycle-file', str(lifecycle))
    run('storage', 'buckets', 'add-iam-policy-binding', f'gs://{bucket}', '--member', f'serviceAccount:{account}', '--role', 'roles/storage.objectAdmin')
    if run('artifacts', 'repositories', 'describe', 'melody-song', '--location', region, check=False):
        run('artifacts', 'repositories', 'create', 'melody-song', '--repository-format=docker', '--location', region)
    run('builds', 'submit', 'cloud', '--config=cloud/cloudbuild.jobs.yaml', '--region', region,
        '--service-account', f'projects/{project}/serviceAccounts/{builder}',
        '--default-buckets-behavior=regional-user-owned-bucket', '--substitutions', f'_IMAGE={image},_HF_SECRET={args.hf_secret},_MUSCRIPTOR_MODEL={args.muscriptor_model}')
    run('run', 'jobs', 'deploy', 'melody-song-v2', '--image', image, '--region', region,
        '--service-account', account, '--cpu=8', '--memory=32Gi', '--task-timeout=21600s',
        '--tasks=1', '--parallelism=1', '--max-retries=1', '--set-env-vars', f'SONG_BUCKET={bucket}')
    text = f'SONG_BUCKET={bucket}\nSONG_JOB_RESOURCE={resource}\nSONG_DUAL_VALIDATED=0\nSONG_MUSCRIPTOR_VALIDATED=0\n'
    if args.write_env:
        path = ROOT/'.env'
        old = path.read_text(encoding='utf-8') if path.exists() else ''
        lines = [line for line in old.splitlines() if not line.startswith(('SONG_BUCKET=', 'SONG_JOB_RESOURCE=', 'SONG_DUAL_VALIDATED=', 'SONG_MUSCRIPTOR_VALIDATED='))]
        path.write_text('\n'.join(lines)+'\n'+text, encoding='utf-8')
    print('\nDeployment complete. Add to .env and restart local server:\n'+text)


if __name__ == '__main__': main()
