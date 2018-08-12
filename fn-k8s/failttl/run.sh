echo [$(date)] hello world
i=0
while [ $i -lt $TTL ]; do
  echo "[$(date)] ($HOSTNAME) $i"
  sleep 1
  i=$(($i+1))
done
