{{- define "node.spec" -}}
replicas: {{ .replicas }}
template:
  metadata:
    labels:
      component: {{ template "fullname" .Global }}
      role: {{ .role }}
  spec:
    securityContext:
      fsGroup: 1000
    {{- if  .nodeSelector }}
    nodeSelector:
      {{- range $key, $value := .nodeSelector }}
      {{ $key }}: {{ $value | quote }}
      {{- end }}
    {{- end }}
    initContainers:
    - name: init-sysctl
      image: busybox
      imagePullPolicy: IfNotPresent
      command: ["sysctl", "-w", "vm.max_map_count=262144"]
      securityContext:
        privileged: true
  {{- if eq .antiAffinity "hard" }}
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: "kubernetes.io/hostname"
            labelSelector:
              matchLabels:
                component: {{ template "fullname" .Global }}
                role: {{ .role }}
    {{- else if eq .antiAffinity "soft" }}
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 1
          podAffinityTerm:
            topologyKey: "kubernetes.io/hostname"
            labelSelector:
              matchLabels:
                component: {{ template "fullname" .Global }}
                role: {{ .role }}
    {{- end }}
    containers:
    - name: es
      securityContext:
        privileged: {{ eq .role "data" }}
        runAsUser: 1000
        capabilities:
          add:
            - IPC_LOCK
            - SYS_RESOURCE
      image: "{{ .Global.Values.common.image.elasticsearch }}:{{ .Global.Values.common.image.tag }}"
      args:
        - sh
        - -c
        - |
          if [ ! -z "${ES_PLUGINS_INSTALL}" ]; then
            OLDIFS=$IFS
            IFS=','
            for plugin in ${ES_PLUGINS_INSTALL}; do
              if ! bin/elasticsearch-plugin list | grep -qs ${plugin}; then
                until bin/elasticsearch-plugin install --batch ${plugin}; do
                  echo "failed to install ${plugin}, retrying in 3s"
                  sleep 3
                done
              fi
            done
            IFS=$OLDIFS
          fi
          bin/elasticsearch
      resources:
        requests:
          memory: {{ .memory.request }}
          cpu: {{ .cpu.request }}
        limits:
          memory: {{ .memory.limit }}
          cpu: {{ .cpu.limit }}
      imagePullPolicy: {{ .Global.Values.common.image.pullPolicy }}
      env:
      - name: NAMESPACE
        valueFrom:
          fieldRef:
            fieldPath: metadata.namespace
      - name: NODE_NAME
        valueFrom:
          fieldRef:
            fieldPath: metadata.name
      - name: DISCOVERY_SERVICE
        value: {{ template "fullname" .Global }}-discovery
      {{- range $key, $value :=  .Global.Values.common.env }}
      - name: {{ $key }}
        value: {{ $value | quote }}
      {{- end }}
      {{- range $key, $value :=  .env }}
      - name: {{ $key }}
        value: {{ $value | quote }}
      {{- end }}
      ports:
      {{- if eq .role "client" }}
      - containerPort: 9200
        name: http
        protocol: TCP
      {{- end }}
      - containerPort: 9300
        name: transport
        protocol: TCP
      volumeMounts:
      - mountPath: /data
        name: {{ template "fullname" .Global }}-storage
      - name: config
        mountPath: /usr/share/elasticsearch/config/elasticsearch.yml
        subPath: elasticsearch.yml
      - name: config
        mountPath: /usr/share/elasticsearch/config/jvm.options
        subPath: jvm.options
      - name: config
        mountPath: /usr/share/elasticsearch/config/log4j2.properties
        subPath: log4j2.properties
    volumes:
      {{- if ne .role "data" }}
      - name: {{ template "fullname" .Global }}-storage
        emptyDir:
          medium: ""
      {{- end }}
      - name: config
        configMap:
          name: {{ template "fullname" .Global }}-es-config
          items:
          - key: elasticsearch.yml
            path: elasticsearch.yml
          - key: jvm.options
            path: jvm.options
          - key: log4j2.properties
            path: log4j2.properties
{{- end -}}
