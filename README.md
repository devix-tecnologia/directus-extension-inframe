# Directus - Extensão Module inFrame

Este projeto é uma extensão do tipo Module para o Directus voltada para visualização de conteúdo em iframes.

##  🚀  Levantando um Directus a partir de docker-compose

- Baixe este projeto ou copie o arquivo `docker-compose.yml` e inicie uma instalação do zero;
- Com o docker instalado na máquina ([saiba mais](https://docs.docker.com/get-docker/)), rode o comando:
```
 docker compose up
```
> [!IMPORTANT]
> _O docker-compose usado neste projeto faz com que o Directus permita iframe de qualquer domínio através do código "CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC: "*". Em produção você deve liberar apenas domínios confiáveis."_


## 💎 Usando a extensão

- Ative o novo módulo na página de configurações do Directus;
- Crie uma nova Coleção com nome de `inframe` e adicione os seguintes campos: ` "id", "status", "icon", "url", "thumbnail", "translations.languages_code", "translations.title"`;

- [Veja mais sobre traduções aqui](https://docs.directus.io/guides/headless-cms/content-translations.html)


## 📌 Links importantes

- [Quickstart Directus](https://docs.directus.io/getting-started/quickstart.html) (na aba Docker Installation)
- [Como Criar uma extensão](https://docs.directus.io/extensions/creating-extensions.html) 
- [Criando um Module personalizado](https://docs.directus.io/guides/extensions/modules-build-landing-page.html)
- [Acessar serviços do Directus](https://docs.directus.io/extensions/services/introduction.html)
- [Acessar itens gravados nas coleções](https://docs.directus.io/extensions/services/accessing-items.html) 
