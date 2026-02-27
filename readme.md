# Conductor (Modernized Fork)

This repository is a maintained and modernized fork of the original **Conductor** workflow server.

The upstream project provides a lightweight workflow orchestration server built on Workflow Core, allowing distributed services and scripts to be coordinated into long-running workflows defined in JSON or YAML.

This fork focuses on modernization, maintainability, and developer experience while preserving compatibility with the original workflow concepts.

---

# 🚀 What’s different in this fork

## Runtime & platform modernization

* Upgraded to **.NET 10**
* Updated NuGet dependencies to current supported versions
* Cleaned up legacy patterns and simplified configuration

## Dependency removal & refactoring

* Removed **RestSharp**
* Replaced with modern native HTTP patterns
* General refactoring for readability and maintainability

## Codebase cleanup

* Restyled and reorganized the project structure
* Improved naming, consistency, and internal layering
* Reduced technical debt from the original implementation

## New scripting engine

The original project supported scripting through **IronPython**.

This fork replaces it with:

* **C# scripting via Roslyn**
* Strong typing and full .NET integration
* Better debugging support
* Improved performance
* No dependency on IronPython runtime

This makes workflow scripting more natural for .NET developers and removes Python runtime constraints.

## Web UI for workflow management

This fork introduces a **Next.js frontend** for managing workflows.

The UI enables:

* Visual workflow definition management
* Instance monitoring
* Workflow triggering
<img width="1915" height="934" alt="image" src="https://github.com/user-attachments/assets/50708fc9-8092-41c7-89b1-fc252e6f2917" />
<img width="1920" height="933" alt="image" src="https://github.com/user-attachments/assets/a2c1ed87-aaff-409c-91c3-649b6a381854" />


This turns Conductor from an API-only server into a full workflow platform.

---

# 📦 Installation

The backend still runs as a containerized workflow server.

Conductor requires:

* MongoDB (required)
* Redis (optional, for multi-node deployments)

## Run with Docker

```bash
docker run -p 127.0.0.1:5001:80 \
  --env dbhost=mongodb://my-mongo-server:27017/ \
  your-docker-image-name
```

## Example docker-compose

```yaml
version: '3'

services:
  conductor:
    image: your-image-name
    ports:
      - "5001:80"
    depends_on:
      - mongo
    environment:
      dbhost: mongodb://mongo:27017/

  mongo:
    image: mongo
```

Add Redis if you plan to run multiple nodes.

---

# 🧩 Workflow basics (unchanged)

Workflows are still:

* Defined in JSON or YAML
* Stored via the Definition API
* Executed via the Workflow API
* Passed a shared data object between steps

Example definition:

```yaml
Id: Hello1
Steps:
- Id: Step1
  StepType: EmitLog
  NextStepId: Step2
  Inputs:
    Message: '"Hello world"'
    Level: '"Information"'

- Id: Step2
  StepType: EmitLog
  Inputs:
    Message: '"Goodbye!!!"'
    Level: '"Information"'
```

Run it:

```
POST /api/workflow/Hello1
```

---

# 🧠 C# Script Example

more examples comming soon 

This replaces the old Python scripting model.

---

# 📚 Original project

This fork is based on the original Conductor project.

You can find the upstream repository here:

https://github.com/danielgerlag/conductor

The original README and documentation still apply for the core workflow concepts and API semantics.

---

# 📄 License

This project remains licensed under the MIT License, in accordance with the original project.

See LICENSE for details.

---

# 🤝 Purpose of this fork

This fork exists to:

* Keep Conductor usable on modern .NET
* Provide a real UI instead of API-only operation
* Replace outdated dependencies
* Improve scripting for .NET teams
* Serve as a production-ready workflow orchestration base

original readme:

```
# Conductor

[<img src="https://api.gitsponsors.com/api/badge/img?id=187114977" height="20">](https://api.gitsponsors.com/api/badge/link?p=VRRpnj284ID04Uw6fKDc21mrU6r++mUHdMSZNVlIaLz4jFHULFMyOhDA6rwZPQFwM1OB9Ll+A/O332YVVamqwQ==)

Conductor is a workflow server built upon [Workflow Core](https://github.com/danielgerlag/workflow-core) that enables you to coordinate multiple services and scripts into workflows so that you can rapidly create complex workflow applications.  Workflows are composed of a series of steps, with an internal data object shared between them to pass information around.  Conductor automatically runs and tracks each step, and retries when there are errors.

Workflows are written in either JSON or YAML and then added to Conductor's internal registry via the definition API.  Then you use the workflow API to invoke them with or without custom data.

### Installation

Conductor is available as a Docker image - `danielgerlag/conductor`

Conductor uses MongoDB as it's datastore, you will also need an instance of MongoDB in order to run Conductor.

Use this command to start a container (with the API available on port 5001) that points to `mongodb://my-mongo-server:27017/` as it's datastore.

```bash
$ docker run -p 127.0.0.1:5001:80/tcp --env dbhost=mongodb://my-mongo-server:27017/ danielgerlag/conductor
```

If you wish to run a fleet of Conductor nodes, then you also need to have a Redis instance, which they will use as a backplane.  This is not required if you are only running one instance.
Simply have all your conductor instances point to the same MongoDB and Redis instance, and they will operate as a load balanced fleet.

#### Environment Variables to configure

You can configure the database and Redis backplane by setting environment variables.
```
dbhost: <<insert connection string to your MongoDB server>>
redis: <<insert connection string to your Redis server>> (optional)
```

If you would like to setup a conductor container (API on port 5001) and a MongoDB container at the same time and have them linked, use this docker compose file:

```Dockerfile
version: '3'
services:
  conductor:
    image: danielgerlag/conductor
    ports:
    - "5001:80"
    links:
    - mongo
    environment:
      dbhost: mongodb://mongo:27017/
  mongo:
    image: mongo
```

### Quick example

We'll start by defining a simple workflow that will log "Hello world" as it's first step and then "Goodbye!!!" as it's second and final step.  We `POST` the definition to `api/definition` in either `YAML` or `JSON`.

```http
POST /api/definition
Content-Type: application/yaml
```
```yml
Id: Hello1
Steps:
- Id: Step1
  StepType: EmitLog
  NextStepId: Step2
  Inputs:
    Message: '"Hello world"'
    Level: '"Information"'
- Id: Step2
  StepType: EmitLog
  Inputs:
    Message: '"Goodbye!!!"'
    Level: '"Information"'
```

Now, lets test it by invoking a new instance of our workflow.
We do this with a `POST` to `/api/workflow/Hello1`
```
POST /api/workflow/Hello1
```

We can also rewrite our workflow to pass custom data to any input on any of it's steps.

```yml
Id: Hello2
Steps:
- Id: Step1
  StepType: EmitLog
  Inputs:
    Message: data.CustomMessage
    Level: '"Information"'
```

Now, when we start a new instance of the workflow, we also initialize it with some data.

```
POST /api/workflow/Hello2
Content-Type: application/x-yaml
```
```yaml
CustomMessage: foobar
```


## Further reading
* [Documentation](https://conductor-core.readthedocs.io/en/latest/)

## Resources

* Download the [Postman Collection](https://raw.githubusercontent.com/danielgerlag/conductor/master/docs/Conductor.postman_collection.json)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
```
