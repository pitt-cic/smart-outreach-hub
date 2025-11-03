export interface CSVRow {
    first_name: string;
    last_name: string;
    phone_number: string;
}

export interface ContactInput {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

export interface UploadResult {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: string[];
}
