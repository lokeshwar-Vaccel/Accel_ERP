import mongoose from 'mongoose';
import { IStock, IStockLocation } from '../types';
export declare const StockLocation: mongoose.Model<IStockLocation, {}, {}, {}, mongoose.Document<unknown, {}, IStockLocation, {}> & IStockLocation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export declare const Stock: mongoose.Model<IStock, {}, {}, {}, mongoose.Document<unknown, {}, IStock, {}> & IStock & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Stock.d.ts.map