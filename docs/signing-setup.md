## Retrieving API Key and Secret
To retrieve the API key and secret from Mozilla, do the following:

- Go to: https://addons.mozilla.org/en-US/developers/addon/api/key/
- Login with following gmail account:
	- Mail: aikidevbsc@gmail.com
	- Password: Check Discord for now
- Once logged in you will be able to see the issuer/key and the secret

## .env file
Once the key and secret is retrieved, an .env file will have to be made.

The .env file should have the following format:
```
AMO_API_KEY=<Insert issuer/key>

AMO_API_SECRET=<Insert secret>
```

The .env file should be placed in the root folder.

## Commandos to run
Once all that is set up, you can now run the following commando:
```
npm run sign
```

Which will run the signing process. Once it has been validated and approved, an xpi file will be created in a folder called "web-ext-artifacts"

## Where to load the extension
Once the previous command has been ran, an xpi file will be created.

You can then do the following:

1. Open Firefox
2. Go to about:addons
3. Click the gear icon
4. Select "Install Add-on From File"
5. Then select the xpi file which is found in the "web-ext-artifacts" folder