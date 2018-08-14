```bash
# go to the fn-k8s directory
cd /path/to/fn-k8s

# set appropriate flags
export PROJECT=YOUR_GCLOUD_PROJECT_NAME
export NAMESPACE=YOUR_K8S_NAMESPACE
export SA_NAME=CHOOSEN_NAME_FOR_SERVICE_ACCOUNT

# create service account named $SA_NAME
gcloud iam service-accounts create $SA_NAME

# assign roles
gcloud projects add-iam-policy-binding $PROJECT \
  --member serviceAccount:$SA_NAME@$PROJECT.iam.gserviceaccount.com \
  --role roles/logging.logWriter
gcloud projects add-iam-policy-binding $PROJECT \
  --member serviceAccount:$SA_NAME@$PROJECT.iam.gserviceaccount.com \
  --role roles/pubsub.publisher
gcloud projects add-iam-policy-binding $PROJECT \
  --member serviceAccount:$SA_NAME@$PROJECT.iam.gserviceaccount.com \
  --role roles/pubsub.subscriber

# get the creds
gcloud iam service-accounts keys create $SA_NAME.json \
    --iam-account $SA_NAME@$PROJECT.iam.gserviceaccount.com

# create a k8s namespace named $NAMESPACE
echo '{
  "kind": "Namespace",
  "apiVersion": "v1",
  "metadata": { "name": "'$NAMESPACE'", "labels": { "name": "'$NAMESPACE'" } }
}' | kubectl create -f-

# allow pods in the namespace $NAMESPACE to spawn other pods
kubectl create clusterrolebinding $NAMESPACE-cluster-admin-role \
  --clusterrole=cluster-admin \
  --serviceaccount=$NAMESPACE:default

# create secret from the $SA_NAME key
kubectl create secret generic gcs-sa \
  -n $NAMESPACE \
  --from-file=gcs-sa.json=$SA_NAME.json

# deploy the subscriber deployment
kubectl apply -f subscriber.yml -n $NAMESPACE

# see the logs of the subscriber
SUBSCRIBER_POD=$(kubectl get po -n $NAMESPACE -l app=subscriber | tail -1 | cut -d' ' -f 1)
kubectl logs -f -n $NAMESPACE $SUBSCRIBER_POD

export PROJECT=backpack-782cb
export NAMESPACE=demo
export SA_NAME=demo-sa
```
