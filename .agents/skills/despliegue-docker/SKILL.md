---
name: despliegue-docker
description: >-
  Guía y comandos para reconstruir y desplegar los contenedores Docker de ADESE.
---

# Skill: Despliegue con Docker

Esta skill contiene las instrucciones para reconstruir los contenedores cuando se instalen nuevos paquetes o se realicen cambios de infraestructura.

## Comandos Principales

### Reconstruir sin caché (cuando se instalan paquetes con npm)
```bash
docker-compose build --no-cache asistencia-frontend
docker-compose up -d asistencia-frontend
```

### Reiniciar todos los servicios
```bash
docker-compose down
docker-compose up -d
```
