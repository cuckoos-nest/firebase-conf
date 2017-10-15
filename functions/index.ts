import {auth, database, https} from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://cuckoos-nest-7a4cf.firebaseio.com"
});


const timezoneOptions = {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
};

export const createUser = auth.user().onCreate(event => {
    const user = event.data;
    admin.database().ref(`/users/${user.uid}`).set({
        followingPhotoCount: 0,
        displayName: user.displayName,
        image: user.photoURL, 
        followersCount: 0,
        followingUsersCount: 0,
        uploadsCount: 0,
        createdAt: new Date().toLocaleString([], timezoneOptions),
    });
    
});

export const onUserUploadDeleted = database.ref('/uploads/{uploadId}')
    .onWrite(event => {
        if (event.data.previous.exists() && !event.data.exists()) {

            // Remove from all walls
            admin.database().ref(`/upload-to-walls/${event.params.uploadId}/`).once('value').then((wallKeys) => {
                if (wallKeys.val()) {
                    for (const wallKey of Object.keys(wallKeys.val())) {
                        admin.database().ref(`/walls/${wallKey}/${event.params.uploadId}`).set(null);
                    }
                }
            });

            // Remove from photo
            admin.database().ref(`/photos/${event.data.previous.val().photo}/uploads/${event.params.uploadId}`).set(null);

            // Remove from user
            admin.database().ref(`/users/${event.data.previous.val().user}/uploads/${event.params.uploadId}`).set(null);

            admin.database().ref(`/archive/uploads/${event.params.uploadId}`).set(event.data.previous.val());
        }
    });

// export const generateThumbnail = storage.object()
//     .onChange(event => {
//         const gcs = require('@google-cloud/storage')();
//         const spawn = require('child-process-promise').spawn;

//         const object = event.data;
//         const filePath = object.name;
//         const resourceState = object.resourceState;
//         const fileBucket = object.bucket;
//         const bucket = gcs.bucket(fileBucket);
//         const contentType = object.contentType;

//         if (resourceState == 'exists' && filePath.startsWith('images/uploads/')) {
//             const folder = filePath.substring(0, filePath.lastIndexOf('/'));
//             const uploadKey = folder.split('/').pop();
//             const fileName = filePath.split('/').pop();
//             if (fileName == 'original') {
//                 const tempFilePath = `/tmp/${fileName}`;
//                 bucket.file(filePath).download({
//                     destination: tempFilePath
//                 }).then(() => {
//                     // Generate a thumbnail using ImageMagick.
//                     spawn('convert', [tempFilePath, '-thumbnail', '200x200>', tempFilePath]).then(() => {
//                         const thumbFilePath = folder + "/small";
//                         // Uploading the thumbnail.
//                         bucket.upload(tempFilePath, {
//                             destination: thumbFilePath,
//                             metadata: {
//                                 contentType: contentType,
//                             }
//                         }).then(() => {
//                             admin.database().ref(`/uploads/${uploadKey}/ready`).set(true);
//                         });
//                     });
//                 });
//             }

//         }
//     });

export const onUserUploadCreated = database.ref('/uploads/{uploadId}')
    .onWrite(event => {
        if (event.data.previous.exists() || !event.data.exists()) {
            return;
        }

        const upload = event.data.val();
        
        // Add to user's uploads
        addToUserUploadOnUploadCreated(upload, event);

        // Increace user's upload count
        increaceUsersUploadCountOnUserCreated(upload);
        
        // Add to user's wall
        addToUsersWallOnUploadCreated(upload, event);

        // Add to category followers wall
        populateToCategoryFollowersOnUploadCreated(upload, event);

        // Add to user's followers wall
        populateToUserFollowersOnUploadCreated(upload, event);

        // Add to photo's uploads
        addToPhotoUploadsOnUploadCreated(upload, event);
        
        // Set the creation date
        event.data.ref.child('createdAt').set(new Date().toLocaleString([], timezoneOptions));

        // Index the description
        admin.database().ref(`/upload-descriptions/${upload.description.substring(0, 3)}/${event.params.uploadId}`).set(upload.description);
    });

const addToUserUploadOnUploadCreated = (upload, event) => {
    admin.database().ref(`/users/${upload.user}/uploads/${event.params.uploadId}`).set(true);
}

const increaceUsersUploadCountOnUserCreated = (upload) => {
    admin.database().ref(`/users/${upload.user}/uploadsCount`).once('value').then((uploadsCount) => {
        admin.database().ref(`/users/${upload.user}/uploadsCount`).set(uploadsCount.val() + 1);
    });
}

const addToUsersWallOnUploadCreated = (upload, event) => {
    admin.database().ref(`/walls/${upload.user}/${event.params.uploadId}`).set(true);
    admin.database().ref(`/upload-to-walls/${event.params.uploadId}/${upload.user}/`).set(true);
}

const populateToCategoryFollowersOnUploadCreated = (upload, event) => {
    admin.database().ref(`/photos/${upload.photo}`).once('value').then((photo) => {
        if (photo.val()) {
            admin.database().ref(`/category-followers/category-to-users/${photo.val().category}`).once('value').then((followerKeys) => {
                if (followerKeys.val()) {
                    const followers = Object.keys(followerKeys.val());
                    for (const follower of followers) {
                        admin.database().ref(`/walls/${follower}/${event.params.uploadId}`).set(true);
                        admin.database().ref(`/upload-to-walls/${event.params.uploadId}/${follower}/`).set(true);
                    }
                }
            });
        }
    });
}

const populateToUserFollowersOnUploadCreated = (upload, event) => {
    admin.database().ref(`/user-followers/users-follow-me/${upload.user}`).once('value').then((followerKeys) => {
        if (followerKeys.val()) {
            const followers = Object.keys(followerKeys.val());
            for (const follower of followers) {
                admin.database().ref(`/walls/${follower}/${event.params.uploadId}`).set(true);
                admin.database().ref(`/upload-to-walls/${event.params.uploadId}/${follower}/`).set(true);
            }
        }
    });
}

const addToPhotoUploadsOnUploadCreated = (upload, event) => {
    admin.database().ref(`/photos/${upload.photo}/uploads/${event.params.uploadId}`).set(true);
}

export const onWallItemAdded = database.ref('/wall/{userId}/')
    .onWrite(event => {
        
    });

export const onUploadCommentAdded = database.ref('/upload-comments/{uploadId}/{commentId}')
    .onWrite(event => {
        // Increace upload comments count
        admin.database().ref(`/uploads/${event.params.uploadId}/commentsCount`).once('value').then((commentsCount) => {
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

export const onPhotoFollowerAdded = database.ref('/photo-followers/{photoId}/{userId}')
    .onWrite(event => {
        admin.database().ref(`/users/${event.params.userId}/followingPhotoCount`).once('value').then((followingPhotoCount) => {
            let count = followingPhotoCount.val();
            if (event.data.exists()) {
                count++;
            }
            else {
                count--;
            }
            admin.database().ref(`/users/${event.params.userId}/followingPhotoCount`).set(count);
        });
    });

const onCommentLikeAdded = database.ref('/comment-likes/{commentId}/{userId}')
    .onWrite(event => {
        // Increace comment likes count
        admin.database().ref(`/comments/${event.params.commentId}/likesCount`).once('value').then((likesCount) => {
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

            admin.database().ref(`/comments/${event.params.commentId}/likesCount`).set(count);
        });
    });

export const onUploadLikeAdded = database.ref('/upload-likes/{uploadId}/{userId}')
    .onWrite(event => {
        // Increace upload likes count
        admin.database().ref(`/uploads/${event.params.uploadId}/likesCount`).once('value').then((likesCount) => {
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
        admin.database().ref(`/uploads/${event.params.uploadId}/`).once('value').then((upload) => {
            if (upload.exists()) {
                admin.database().ref(`/notifications/${upload.val().user}`).push({
                    type: 1,
                    from: event.params.userId,
                    link: 'upload',
                    linkKey: event.params.uploadId,
                    isRead: false,
                    isSystem: false,
                    createdAt: new Date().toLocaleString([], timezoneOptions),
                });
            }
        });
    });

export const clean = https
    .onRequest((req, res) => {
        admin.database().ref('/acrhive').set(null);    
        admin.database().ref('/uploads').set(null);
        admin.database().ref('/upload-likes').set(null);
        admin.database().ref('/comments').set(null);
        admin.database().ref('/notifications').set(null);
        admin.database().ref('/photo-followers').set(null);
        admin.database().ref('/recent-searches').set(null);
        admin.database().ref('/upload-comments').set(null);
        admin.database().ref('/upload-descriptions').set(null);     
        admin.database().ref('/upload-to-walls').set(null);     
        admin.database().ref('/user-followers').set(null);     
        admin.database().ref('/walls').set(null);    

        admin.database().ref(`/photos`).once('value').then((photos) => {
            if (photos.exists()) {
                let keys = Object.keys(photos.val());
                for(let key of keys) {
                    admin.database().ref(`/photos/${key}/uploads`).set(null);
                }
            }
        });

        admin.database().ref(`/users`).once('value').then((users) => {
            if (users.exists()) {
                let keys = Object.keys(users.val());
                for(let key of keys) {
                    admin.database().ref(`/users/${key}/uploads`).set(null);
                    admin.database().ref(`/users/${key}/followersCount`).set(null);
                    admin.database().ref(`/users/${key}/followingPhotoCount`).set(null);
                    admin.database().ref(`/users/${key}/followingUsersCount`).set(null);
                    admin.database().ref(`/users/${key}/uploadsCount`).set(null);
                }
            }
        });
    });

export const clearUsers = https
    .onRequest((req, res) => {
        // Implement..
    });

export const reportAdded = database.ref('/reports/{reportKey}')
   .onWrite(event => {
        let count = 1;
        admin.database().ref(`/uploads/${event.params.reportKey}/reportsCount`).once('value').then((reportsCount) => {
            if (reportsCount.exists()) {
                if (event.data.exists()) {
                    count = reportsCount.val() + 1;
                }
                
            }

            admin.database().ref(`/uploads/${event.params.reportKey}/reportsCount`).set(count);
            
            // after 5 reports the picture will be deleted automatically
            if(count == 5)
            { 
                admin.database().ref(`/uploads/${event.params.reportKey}`).set(null);
            
            }
        });


        if(count == 5)
        {
            // alert the user that its photo has been deleted
            admin.database().ref(`/uploads/${event.params.reportKey}/`).once('value').then((upload) => {
                admin.database().ref(`/notifications/${upload.val().user}`).push({
                    type: 2,
                    from: 'Administrator',
                    link: 'upload',
                    linkKey: event.params.reportKey,
                    isRead: false,
                    isSystem: true,
                    createdAt: new Date().toLocaleString([], timezoneOptions),
                });
            });
        }
   });
