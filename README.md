# Directus - Extensão iframe

Este projeto é uma extensão para o Directus que cria extensões voltadas para visualização de conteúdo em iframes.

##  🚀  Levantando um Directus a partir de docker-compose

- Baixe este projeto ou copie o arquivo `docker-compose.yml` e inicie uma instalação do zero;
- Com o docker instalado na máquina ([saiba mais](https://docs.docker.com/get-docker/)), rode o comando:
```
 docker compose up
```

## 💎 Criando extensões

- Em um novo terminal, vá até a pasta `/extensions` (ou, caso tenha configurado o docker-compose de outra forma, até a pasta que foi mapeada para tal) e utilize o comando:

```
npx create-directus-extension@latest
```

- Um utilitário para criação de extensões será aberto para selecionar que tipo de extensão criar, o nome da extensão, a linguagem de programação que será usada etc.
- Após criação no próprio terminal aparecerão os comandos básicos para rodar sua extensão.

> [!IMPORTANT]
> _Cada vez que criar uma nova extensão ou atualizar uma já existente será necessário reiniciar o Directus_

## 📌 Links importantes

- [Quickstart Directus](https://docs.directus.io/getting-started/quickstart.html) (na aba Docker Installation)
- [Como Criar uma extensão](https://docs.directus.io/extensions/creating-extensions.html) 
- [Acessar serviços do Directus](https://docs.directus.io/extensions/services/introduction.html)
- [Acessar itens gravados nas coleções](https://docs.directus.io/extensions/services/accessing-items.html) (Por exemplo: consultar, inserir, excluir os clientes)
