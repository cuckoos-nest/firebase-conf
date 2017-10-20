# firebase-conf
The closest thing to "server side" Cuckoo's Nest has

## Overview
This repo holds the configuration files for [Cuckoo's Nest](https://github.com/cuckoos-nest/cuckoos-nest)'s Firebase application.

## Content
### Firebase Functions
[functions/index.js](https://github.com/cuckoos-nest/firebase-conf/blob/master/functions/index.js) defines database triggers and HTTP functions the application needs to operate, such as: A trigger to update the likes counter for a post, a trigger to create metadata for new users, a trigger that adds a post to a follower's wall, and so on...

### Administrator Dashboard
The [administrator dashboard](https://github.com/cuckoos-nest/firebase-conf/tree/master/public) is a webpage that allows an administrator to easily add photos and categories to the database.

## Running it locally
If you need help to run this project locally, please use the [Firebase's official tutorial](https://firebase.google.com/docs/functions/local-emulator)

## Contributing
[Check for open issues](https://github.com/cuckoos-nest/firebase-conf/issues) or add your own features by starting a pull request.

If you need access to the Facebook application or Firebase account for contribution needs, let us know and we will work something out.

Feel free to contact us on: eliran013@gmail.com
