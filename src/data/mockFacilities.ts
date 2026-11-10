import { MedicalFacility, AmbulanceUnit } from '../types/spatial';

// Fasilitas Kesehatan Rujukan Siaga Darurat 24 Jam
export const INITIAL_FACILITIES: MedicalFacility[] = [
  {
    id: 'faskes-1',
    name: 'RS PKU Muhammadiyah Yogyakarta',
    type: 'RSUD',
    address: 'Jl. KH. Ahmad Dahlan No.20, Ngupasan, Gondomanan, Yogyakarta',
    phone: '0274-512653',
    coordinates: {
      latitude: -7.8005,
      longitude: 110.3621,
    },
    emergencyBedsAvailable: 8,
    isIgd24Hours: true,
  },
  {
    id: 'faskes-2',
    name: 'RSUP Dr. Sardjito',
    type: 'RSUP',
    address: 'Jl. Kesehatan No.1, Sekip, Sinduadi, Mlati, Sleman',
    phone: '0274-587333',
    coordinates: {
      latitude: -7.7686,
      longitude: 110.3736,
    },
    emergencyBedsAvailable: 14,
    isIgd24Hours: true,
  },
  {
    id: 'faskes-3',
    name: 'RS Panti Rapih',
    type: 'RS Swasta',
    address: 'Jl. Cik Di Tiro No.30, Terban, Gondokusuman, Yogyakarta',
    phone: '0274-563333',
    coordinates: {
      latitude: -7.7774,
      longitude: 110.3762,
    },
    emergencyBedsAvailable: 5,
    isIgd24Hours: true,
  },
  {
    id: 'faskes-4',
    name: 'RSUD Kota Yogyakarta (Wirowasitan)',
    type: 'RSUD',
    address: 'Jl. Wirosaban No.1, Sorosutan, Umbulharjo, Yogyakarta',
    phone: '0274-371195',
    coordinates: {
      latitude: -7.8258,
      longitude: 110.3805,
    },
    emergencyBedsAvailable: 11,
    isIgd24Hours: true,
  },
  {
    id: 'faskes-5',
    name: 'Puskesmas Gondomanan 24 Jam',
    type: 'Puskesmas',
    address: 'Jl. Mayor Suryotomo No.28, Gondomanan, Yogyakarta',
    phone: '0274-512019',
    coordinates: {
      latitude: -7.7981,
      longitude: 110.3698,
    },
    emergencyBedsAvailable: 2,
    isIgd24Hours: true,
  },
];

// Unit Ambulans Siaga Lapangan
export const INITIAL_AMBULANCES: AmbulanceUnit[] = [
  {
    id: 'amb-01',
    callSign: 'Ambulans Siaga PKU 01',
    licensePlate: 'AB 1122 UMY',
    hospitalName: 'RS PKU Muhammadiyah',
    status: 'available',
    coordinates: {
      latitude: -7.802,
      longitude: 110.364,
    },
  },
  {
    id: 'amb-02',
    callSign: 'Ambulans Reaksi Cepat Sardjito',
    licensePlate: 'AB 9911 UGM',
    hospitalName: 'RSUP Dr. Sardjito',
    status: 'available',
    coordinates: {
      latitude: -7.771,
      longitude: 110.371,
    },
  },
  {
    id: 'amb-03',
    callSign: 'Rescue PMI Siaga Bencana',
    licensePlate: 'AB 118 PMI',
    hospitalName: 'Markas PMI DIY',
    status: 'dispatched',
    coordinates: {
      latitude: -7.788,
      longitude: 110.379,
    },
  },
];

