# NosTale Cryptography

Forked from https://github.com/NicoGorr/nostale-cryptography

Thanks to [@NicoGorr](https://github.com/NicoGorr) ([original module](https://github.com/NicoGorr/nostale-cryptography)) and [@morsisko](https://github.com/morsisko) ([NoS0577 "magic" value](https://github.com/morsisko/NosTale-Auth))

### Basic Example

```js
const {pipeline} = require('stream');
const iconv = require('iconv-lite');
const net = require('net');
const nosCrypto = require('nostale-cryptography/client');

;(async () => {
    let locale = "fr_FR";
    let gfLang = "fr";
    /*
    You can find your installationId in regedit under:
    HKEY_CURRENT_USER > Software > Gameforge4d > TNTClient > MainApp, keyName: installationId
    */
    let installationId = "xxxx";

    let nostalePath = "D:\\\Your\\\Path";

    let username = "";
    let password = "";

    let token = await nosCrypto.getToken(locale, gfLang, installationId, username, password);

    let encodedUsername = iconv.encode(username, 'win1252')

    // Possible lang iso codes
    // EN, DE, FR, IT, PL, ES, CZ, RU, TR
    // source : https://www.elitepvpers.com/forum/nostale/4736911-help-new-packet-login.html#post38057067
    let version = await nosCrypto.createVersion(nostalePath, gfLang.toUpperCase())
    let checksumHash = await nosCrypto.createChecksumHash(encodedUsername, nostalePath)

    let loginPacket = `NoS0577 ${token}  ${installationId} ${version} 0 ${checksumHash}`;

    let host = '';
    let port = '';

    let loginResponse = await new Promise((resolve) => {
        const loginSocket = net.connect(port, host, () => {
            let encodingLoginStream = iconv.encodeStream('win1252');
            let decodingLoginStream = iconv.decodeStream('win1252');

            pipeline(
                encodingLoginStream,
                nosCrypto.createCipher(),
                loginSocket,
                nosCrypto.createDecipher(),
                decodingLoginStream,
                (err) => {
                    if (err) {
                        throw err
                    }
                }
            );

            console.log("LPacket >> " + loginPacket);
            encodingLoginStream.write(loginPacket);

            decodingLoginStream.on('data', (packet) => {
                console.log("LPacket << " + packet);
                resolve(packet);
            });
        });

        loginSocket.on("close", () => {
            loginSocket.destroy();
        });
    });

    // Process login response (NsTeST packet or failc)
    // Login fail responses
    // failc 1 - wrong client version
    // failc 2 - some kind of error while connecting (unknown)
    // failc 3 - maintenance
    // failc 4 - account already logged in
    // failc 5 - wrong id/password
    // failc 6 - you can't connect (unknown)
    // failc 7 - banned
    // failc 8 - you can't connect from this country (used for korean nostale)
    // failc 9 - lower/uppercase mistake in ID.
    // source : https://www.elitepvpers.com/forum/nostale/4561025-packet-connection-question.html#post37293530

    // Get these from NsTeST packet
    let gameIp = "";
    let gamePort = "";
    let sessionId = "";

    console.log("Connecting to : " + gameIp + ":" + gamePort);
    let gameSocket = net.connect(gamePort, gameIp, () => {
        let encodingStream = iconv.encodeStream('win1252');
        let decodingStream = iconv.decodeStream('win1252');

        pipeline(
            encodingStream,
            nosCrypto.createCipher(sessionId),
            gameSocket,
            nosCrypto.createDecipher(sessionId),
            decodingStream,
            (err) => {

            }
        );

        // Send sessionId packet
        encodingStream.write("packetID " + sessionId);

        // Send world login
        setTimeout(() => {
            encodingStream.write("packetID " + username + " GF " + nosCrypto.getLanguageCodeByIso('FR'));
            encodingStream.write("packetID " + "thisisgfmode");
        }, 1000);

        decodingStream.on('data', (packet) => {
            // World packets
            console.log(packet);
        });
    });

    gameSocket.on("close", (e) => {
        console.log("gameSocket closed");
    });

    gameSocket.on("error", (e) => {
        console.log("an error occured");
    });

    gameSocket.on("end", (e) => {
        console.log("connection ended");
    });
})();
```