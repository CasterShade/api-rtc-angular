import { Component } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';

declare var apiRTC: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ApiRTC-angular';
  conversation:any;
  screensharingStream:any =null;

  conversationFormGroup = this.fb.group({
    name: this.fb.control('', [Validators.required])
  });

  constructor(private fb: FormBuilder) {
  }

  get conversationNameFc(): FormControl {
    return this.conversationFormGroup.get('name') as FormControl;
  }

  getOrcreateConversation() {
    var localStream: null = null;

    //==============================
    // 1/ CREATE USER AGENT
    //==============================
    var ua = new apiRTC.UserAgent({
      uri: 'apzkey:myDemoApiKey'
    });

    //==============================
    // 2/ REGISTER
    //==============================
    ua.register().then((session: { getConversation: (arg0: any) => any; }) => {

      //==============================
      // 3/ CREATE CONVERSATION
      //==============================
      this.conversation = session.getConversation(this.conversationNameFc.value);

      //==========================================================
      // 4/ ADD EVENT LISTENER : WHEN NEW STREAM IS AVAILABLE IN CONVERSATION
      //==========================================================
      this.conversation.on('streamListChanged', (streamInfo: any) => {
        console.log("streamListChanged :", streamInfo);
        if (streamInfo.listEventType === 'added') {
          if (streamInfo.isRemote === true) {
            this.conversation.subscribeToMedia(streamInfo.streamId)
              .then((stream: any) => {
                console.log('subscribeToMedia success');
              }).catch((err: any) => {
                console.error('subscribeToMedia error', err);
              });
          }
        }
      });
      //=====================================================
      // 4 BIS/ ADD EVENT LISTENER : WHEN STREAM IS ADDED/REMOVED TO/FROM THE CONVERSATION
      //=====================================================
      this.conversation.on('streamAdded', (stream: any) => {
        stream.addInDiv('remote-container', 'remote-media-' + stream.streamId, {}, false);
      }).on('streamRemoved', (stream: any) => {
        stream.removeFromDiv('remote-container', 'remote-media-' + stream.streamId);
      });

      //==============================
      // 5/ CREATE LOCAL STREAM
      //==============================
      ua.createStream({
        constraints: {
          audio: true,
          video: true
        }
      })
        .then((stream: any) => {

          console.log('createStream :', stream);

          // Save local stream
          localStream = stream;
          stream.removeFromDiv('local-container', 'local-media');
          stream.addInDiv('local-container', 'local-media', {}, true);

          //==============================
          // 6/ JOIN CONVERSATION
          //==============================
          this.conversation.join()
            .then((response: any) => {
              //==============================
              // 7/ PUBLISH LOCAL STREAM
              //==============================
              this.conversation.publish(localStream);
            }).catch((err: any) => {
              console.error('Conversation join error', err);
            });

        }).catch((err: any) => {
          console.error('create stream error', err);
        });
    });
  }
  
  //==============================
    // SCREENSHARING FEATURE
    //==============================
  
  screenShare() {
    if (this.screensharingStream === null) {

        const displayMediaStreamConstraints = {
            video: {
                cursor: "always"
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        };

        apiRTC.Stream.createDisplayMediaStream(displayMediaStreamConstraints, false)
            .then((stream: { on: (arg0: string, arg1: () => void) => void; }) => {

                stream.on('stopped', () => {
                    //Used to detect when user stop the screenSharing with Chrome DesktopCapture UI
                    console.log("stopped event on stream");
                    var elem = document.getElementById('local-screensharing');
                    if (elem !== null) {
                        elem.remove();
                    }
                    this.screensharingStream = null;
                });

                this.screensharingStream = stream;
                this.conversation.publish(this.screensharingStream);
                // Get media container
                var container:any = document.getElementById('local-container');

                // Create media element
                var mediaElement = document.createElement('video');
                mediaElement.id = 'local-screensharing';
                mediaElement.autoplay = true;
                mediaElement.muted = true;

                // Add media element to media container
                container.appendChild(mediaElement);

                // Attach stream
                this.screensharingStream.attachToElement(mediaElement);

            })
            .catch(function(err: any) {
                console.error('Could not create screensharing stream :', err);
            });
    } else {
      this.conversation.unpublish(this.screensharingStream);
        this.screensharingStream.release();
        const screensharingStream = null;
        var elem = document.getElementById('local-screensharing');
        if (elem !== null) {
            elem.remove();
        }
    }
}

}
