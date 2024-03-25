# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container to /usr/src/app
WORKDIR /usr/src/app

# Copy the package.json file and other necessary node files into the container
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the web-server directory into the container at /usr/src/app/web-server
COPY web-server/ web-server/

# Expose port 80 to the outside world
EXPOSE 80

# Set the environment variable
ENV NAME World

# Run server.js when the container launches
# Ensure the path is correct based on where server.js is located after the COPY command
CMD ["node", "web-server/server.js"]



