var functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://cuckoos-nest-7a4cf.firebaseio.com"
});


// // Start writing Firebase Functions
// // https://firebase.google.com/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// })

exports.createUser = functions.auth.user().onCreate(event => {
    const user = event.data;
    admin.database().ref(`/users/${user.uid}`).set({
        followingPhotoCount: 0,
        displayName: user.displayName,
        image: user.photoURL, 
        followersCount: 0,
        followingUsersCount: 0,
        uploadsCount: 0,
        createdAt: new Date().toLocaleString(),
    });
});

exports.onUserUploadCreated = functions.database.ref('/uploads/{uploadId}')
    .onWrite(event => {
        if (event.data.previous.exists() || !event.data.exists()) {
            return;
        }

        const upload = event.data.val();
        // Add to user's uploads
        admin.database().ref(`/users/${upload.user}/uploads/${event.params.uploadId}`).set(true);
        
        // Increace user's upload count
        admin.database().ref(`/users/${upload.user}/uploadsCount`).once('value').then(function(uploadsCount) {
            admin.database().ref(`/users/${upload.user}/uploadsCount`).set(uploadsCount.val() + 1);
        });

        // Add to user's wall
        admin.database().ref(`/walls/${upload.user}/${event.params.uploadId}`).set(true);

        // Add to category followers wall
        admin.database().ref(`/photos/${upload.photo}`).once('value').then(function(photo) {
            if (photo.val()) {
                admin.database().ref(`/category-followers/category-to-users/${photo.val().category}`).once('value').then(function(followerKeys) {
                    if (followerKeys.val()) {
                        const followers = Object.keys(followerKeys.val());
                        for (const follower of followers) {
                            admin.database().ref(`/walls/${follower}/${event.params.uploadId}`).set(true);
                        }
                    }
                });
            }
        });

        // Add to user's followers wall
        admin.database().ref(`/user-followers/users-follow-x/${upload.user}`).once('value').then(function(followerKeys) {
            if (followerKeys.val()) {
                const followers = Object.keys(followerKeys.val());
                for (const follower of followers) {
                    admin.database().ref(`/walls/${follower}/${event.params.uploadId}`).set(true);
                }
            }
        });
        
        
        // Add to photo's uploads
        admin.database().ref(`/photos/${upload.photo}/uploads/${event.params.uploadId}`).set(true);
        
        // Set the creation date
        var options = {
            timeZone: 'Asia/Jerusalem',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
        };

        event.data.ref.child('createdAt').set(new Date().toLocaleString([], options));

        // Index the description
        admin.database().ref(`/upload-descriptions/${upload.description.substring(0, 3)}/${event.params.uploadId}`).set(upload.description);
    });

exports.onWallItemAdded = functions.database.ref('/wall/{userId}/')
    .onWrite(event => {
        
    });

exports.onUploadCommentAdded = functions.database.ref('/upload-comments/{uploadId}/{commentId}')
    .onWrite(event => {
        // Increace upload comments count
        admin.database().ref(`/uploads/${event.params.uploadId}/commentsCount`).once('value').then(function(commentsCount) {
            let count = 1;
            if (commentsCount.exists()) {
                if (event.data.exists()) {
                    // Add comment  
                    count = commentsCount.val() + 1;
                }
                else {
                    // Remove comment
                    count = commentsCount.val() - 1;
                }
            }

            admin.database().ref(`/uploads/${event.params.uploadId}/commentsCount`).set(count);
        });
    });

exports.onUploadLikeAdded = functions.database.ref('/upload-likes/{uploadId}/{userId}')
    .onWrite(event => {
        // Increace upload likes count
        admin.database().ref(`/uploads/${event.params.uploadId}/likesCount`).once('value').then(function(likesCount) {
            let count = 1;
            if (likesCount.exists()) {
                if (event.data.exists()) {
                    // Like
                    count = likesCount.val() + 1;
                }
                else {
                    // Unlike
                    count = likesCount.val() - 1;
                }
            }

            admin.database().ref(`/uploads/${event.params.uploadId}/likesCount`).set(count);
        });


        if (!event.data.exists()) {
            // Unlike
            return;
        }

        // Send notification
        admin.database().ref(`/uploads/${event.params.uploadId}/`).once('value').then(function(upload) {
            if (upload.exists()) {
                admin.database().ref(`/notifications/${upload.val().user}`).push({
                    type: 1,
                    from: event.params.userId,
                    upload: event.params.uploadId,
                    isRead: false,
                    createdAt: new Date().toLocaleString(),
                });
            }
        });
    });

exports.clearUploads = functions.https
    .onRequest((req, res) => {
        // Implement..
        //admin.database().ref(`/uploads`).set(null);
    });

exports.clearUsers = functions.https
    .onRequest((req, res) => {
        // Implement..
    });