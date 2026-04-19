// Euclidean distance in 3D space
import {OKLAB} from "@/app/types";

export function getDistance(c1: OKLAB, c2: OKLAB): number {
    return Math.sqrt((c1.L - c2.L) ** 2 + (c1.a - c2.a) ** 2 + (c1.b - c2.b) ** 2);
}