
## Telegram Image Generation Bot

This is a Node.js-based Telegram bot that allows users to generate AI images based on text prompts. It integrates with the Stability AI API for image generation and Cloudinary for image storage, providing a seamless and interactive experience for users.

## 📋 Features

- **Generate AI Images**: Users can describe an image they want to generate, and the bot will create it using AI.
- **Image Storage**: Images are uploaded to Cloudinary, making them easily accessible.
- **Status Check**: Users can check the status of their image generation requests.
- **Session Management**: The bot tracks user sessions and manages prompts for streamlined interactions.
- **Database Integration**: Stores user data and job requests in a MySQL database.

## 🔧 Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/shutterai-bot.git
   cd shutterai-bot
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**

   Create a `.env` file in the root directory and add the following variables:

   ```bash
   TELEGRAM_TOKEN=your_telegram_token
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   STABILITY_API_KEY=your_stability_ai_api_key
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_db_password
   DB_NAME=shutterai
   ```

4. **Start the Server**

   ```bash
   npm start
   ```

   The server should be running on `http://localhost:4000`.

## ⚙️ Configuration

- **Cloudinary**: Configure your Cloudinary account by providing the necessary credentials in the `.env` file.
- **Database**: The bot uses MySQL for user and job management. Ensure that you have MySQL installed and create a database named `shutterai`.

## 🛠️ Usage

1. Start the Telegram bot using the `/start` command.
2. Choose from the menu options to generate an image, check status, or view your generated images.
3. For generating images, simply describe the image you want, and the bot will respond with the generated image once it's ready.

## 📚 Dependencies

- [express](https://www.npmjs.com/package/express)
- [node-fetch](https://www.npmjs.com/package/node-fetch)
- [cors](https://www.npmjs.com/package/cors)
- [body-parser](https://www.npmjs.com/package/body-parser)
- [multer](https://www.npmjs.com/package/multer)
- [node-telegram-bot-api](https://www.npmjs.com/package/node-telegram-bot-api)
- [mysql2](https://www.npmjs.com/package/mysql2)
- [axios](https://www.npmjs.com/package/axios)
- [cloudinary](https://www.npmjs.com/package/cloudinary)

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request if you have any improvements or bug fixes.


## 📧 Contact

For any inquiries or support, please reach out at [ajibodedaniel477@gmail.com](mailto:ajibodedaniel477@gmail.com).

