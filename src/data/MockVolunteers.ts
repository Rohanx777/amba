export interface Volunteer {
    id: string;
    coordinate: {
        latitude: number;
        longitude: number;
    };
    distance: number; // in meters (mock)
}

const MOCK_VOLUNTEERS: Volunteer[] = [
    { id: 'v1', coordinate: { latitude: 28.6139, longitude: 77.2090 }, distance: 120 },
    { id: 'v2', coordinate: { latitude: 28.6129, longitude: 77.2100 }, distance: 350 },
    { id: 'v3', coordinate: { latitude: 28.6145, longitude: 77.2080 }, distance: 480 },
];

export default MOCK_VOLUNTEERS;
