import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Buffer } from 'buffer';
import * as UPNG from 'upng-js';
import * as ImageManipulator from 'expo-image-manipulator';

// Make sure these paths match your project structure!
import { rgbToOklab } from "@/app/utils/rgbToOklab";
import { MINECRAFT_DYES } from "@/app/colors";
import { hexToRgb } from "@/app/utils/hexToRgb";
import { getDistance } from "@/app/utils/getDistance";

export default function Index() {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();

    const cameraRef = useRef<CameraView>(null);
    const [matchingDye, setMatchingDye] = useState<string | null>(null);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="Grant Permission" />
            </View>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    }

    const analyzeColor = async () => {
        if (!cameraRef.current) return;

        try {
            // 1. Take the photo (Capture the full resolution)
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5, // Slightly higher quality helps with crop accuracy
            });

            // 2. Define our crop area
            // We'll grab a 100px square. If the photo is 3000px wide,
            // this is a tiny precise box in the dead center.
            const cropSize = 100;
            const originX = (photo.width / 2) - (cropSize / 2);
            const originY = (photo.height / 2) - (cropSize / 2);

            // 3. Crop then Shrink
            const manipulated = await ImageManipulator.manipulateAsync(
                photo.uri,
                [
                    { crop: { originX, originY, width: cropSize, height: cropSize } },
                    { resize: { width: 1, height: 1 } }
                ],
                { format: ImageManipulator.SaveFormat.PNG, base64: true }
            );

            if (manipulated.base64) {
                // 3. Convert Base64 to a format UPNG can read
                const nodeBuffer = Buffer.from(manipulated.base64, 'base64');
                const arrayBuffer = nodeBuffer.buffer.slice(
                    nodeBuffer.byteOffset,
                    nodeBuffer.byteOffset + nodeBuffer.byteLength
                ) as ArrayBuffer;
                const img = UPNG.decode(arrayBuffer);

// UPNG.toRGBA8 returns an array of ArrayBuffers.
// We take the first one [0] and wrap it in a Uint8Array to read it.
                const rgbaArray = new Uint8Array(UPNG.toRGBA8(img)[0]);

// Now we can actually read the numbers!
                const r = rgbaArray[0];
                const g = rgbaArray[1];
                const b = rgbaArray[2];

                console.log(`Successfully Scanned RGB: ${r}, ${g}, ${b}`);

// 4. Run your Match Logic
// Remember: your function expects an object {r, g, b}
                const targetOklab = rgbToOklab({ r, g, b });

                let closestDye = MINECRAFT_DYES[0];
                let minDistance = Infinity;

                for (const dye of MINECRAFT_DYES) {
                    const dyeRgb = hexToRgb(dye.hex);
                    const dyeOklab = rgbToOklab(dyeRgb);

                    const dist = getDistance(targetOklab, dyeOklab);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestDye = dye;
                    }
                }

                setMatchingDye(closestDye.name);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                <View style={styles.overlay}>
                    <View style={styles.reticle} />
                    <Text style={styles.resultText}>
                        {matchingDye ? `Closest Match: ${matchingDye}` : "Point and Scan"}
                    </Text>
                </View>
            </CameraView>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={analyzeColor}>
                    <Text style={styles.text}>Scan Shirt</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                    <Text style={styles.text}>Flip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 64,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        width: '100%',
        paddingHorizontal: 64,
    },
    button: {
        flex: 1,
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        textShadowColor: 'black',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 5,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reticle: {
        width: 30,
        height: 30,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    resultText: {
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 10,
        marginTop: 20,
        borderRadius: 10,
        fontSize: 18,
        fontWeight: '600',
        overflow: 'hidden',
    },
});