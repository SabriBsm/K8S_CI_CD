# GitHub Runner Setup (PlanSync)

Ce projet utilise un runner self-hosted pour le job `deploy` (`runs-on: [self-hosted, linux, x64, plansync-k8s]`).

## 1) Installer le runner sur `master-k8s`

```bash
sudo useradd -m -s /bin/bash github-runner || true
sudo mkdir -p /opt/actions-runner
sudo chown -R github-runner:github-runner /opt/actions-runner
```

```bash
sudo -u github-runner -H bash -lc '
cd /opt/actions-runner
curl -o actions-runner-linux-x64-2.327.1.tar.gz -L https://github.com/actions/runner/releases/download/v2.327.1/actions-runner-linux-x64-2.327.1.tar.gz
tar xzf actions-runner-linux-x64-2.327.1.tar.gz
'
```

## 2) Enregistrer le runner

Dans GitHub: `Repo -> Settings -> Actions -> Runners -> New self-hosted runner -> Linux x64`.
Copie la commande `./config.sh ...` et exécute-la sur `master-k8s`.

Exemple:

```bash
sudo -u github-runner -H bash -lc '
cd /opt/actions-runner
./config.sh \
  --url https://github.com/SabriBsm/K8S_CI_CD \
  --token <RUNNER_TOKEN_TEMPORAIRE> \
  --labels plansync-k8s \
  --unattended \
  --name master-k8s-runner
'
```

## 3) Installer comme service systemd

```bash
cd /opt/actions-runner
sudo ./svc.sh install github-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

## 4) Pré-requis pour le déploiement Kubernetes

Le service du runner doit pouvoir exécuter `kubectl` sur ton cluster:

```bash
sudo -u github-runner -H kubectl get nodes
sudo -u github-runner -H kubectl -n plansync get pods
```

Si ça échoue, copie le kubeconfig admin:

```bash
sudo mkdir -p /home/github-runner/.kube
sudo cp /etc/kubernetes/admin.conf /home/github-runner/.kube/config
sudo chown -R github-runner:github-runner /home/github-runner/.kube
chmod 600 /home/github-runner/.kube/config
```

## 5) Secrets GitHub requis

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Repo path: `Settings -> Secrets and variables -> Actions -> New repository secret`.

