FROM node:24

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to install dependencies
# This is done before copying the rest of the code to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# The application is configured to run on port 8080
EXPOSE 8080

# Run the application using the npm start script
CMD ["npm", "start"]