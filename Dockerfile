FROM node:20-alpine

WORKDIR /usr/src/app

# Instalujemy narzędzia ratunkowe do uruchamiania bez budowania
RUN npm install -g ts-node typescript tsconfig-paths

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate

# Próbujemy zbudować, ale jak system zabije proces przez RAM, jedziemy dalej
RUN npm run build || true

EXPOSE 3000

# PANCERNY START:
# Jeśli kompilator padł i nie ma main.js, serwer odpali kod czystym TypeScriptem!
CMD sh -c "node dist/main.js || ts-node -r tsconfig-paths/register src/main.ts"