# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# optional default value (can be overridden by docker run / compose)
ENV DBHOST="mongodb://localhost:27017/"

# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# copy only csproj first for better layer caching
COPY src/Conductor/Conductor.csproj Conductor/
RUN dotnet restore Conductor/Conductor.csproj

# now copy everything else
COPY src/ .

WORKDIR /src/Conductor
RUN dotnet publish Conductor.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# ---------- final ----------
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Conductor.dll"]