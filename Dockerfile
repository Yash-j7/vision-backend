# Use official Node image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies inside container (important!)
RUN npm install --omit=dev

# If bcrypt was previously built locally, force rebuild
RUN npm rebuild bcrypt --build-from-source

# Copy rest of the app
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Start command
CMD ["npm", "start"]
