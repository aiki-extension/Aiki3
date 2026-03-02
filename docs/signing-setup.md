## How is the extension signed?
The extension is signed using Mozilla's Add-on Signing API. This allows the extension to be signed and verified by Mozilla, ensuring that it is safe to use and has not been tampered with.

The API key and secret are stored in the Github repository's secrets, which are used to sign the extension when it is built.

Whenever there is a push to the main or the bsc_development_main branch, the workflow `sign.yml` is triggered, which runs the signing process. The signed extension is then uploaded as an artifact, which can be downloaded and installed in either Firefox or Chrome.