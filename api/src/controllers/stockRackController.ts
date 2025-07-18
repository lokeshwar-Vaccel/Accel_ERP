import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { isValidObjectId } from 'mongoose';
import { APIResponse } from '../utils/apiResponse';
import { Rack, Stock } from '../models/Stock';
import { AuthenticatedRequest } from '../types';

// CREATE Rack
export const createRack = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, location, room, description, isActive } = req.body;

    if (!isValidObjectId(location)) throw new AppError('Invalid location ID', 400);
    if (!isValidObjectId(room)) throw new AppError('Invalid room ID', 400);

    const rack = await Rack.create({ name, location, room, description, isActive });
    res.status(201).json(new APIResponse(true, 'Rack created successfully', rack));
  } catch (err) {
    next(err);
  }
};

// GET Racks with Pagination, Filter
export const getRacks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, search = '', location, room } = req.query;

    const filter: any = {
      ...(location && { location }),
      ...(room && { room }),
      ...(search && { name: { $regex: search, $options: 'i' } }),
    };

    const [racks, total] = await Promise.all([
      Rack.find(filter)
        .populate('location', 'name type')
        .populate('room', 'name description')
        // .skip((+page - 1) * +limit)
        // .limit(+limit)
        .sort({ "name": 1 }),
      Rack.countDocuments(filter),
    ]);

    res.json(new APIResponse(true, 'Racks fetched', { racks, total }));
  } catch (err) {
    next(err);
  }
};

// UPDATE Rack
export const updateRack = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rack = await Rack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rack) throw new AppError('Rack not found', 404);
    res.json(new APIResponse(true, 'Rack updated', rack));
  } catch (err) {
    next(err);
  }
};

// TOGGLE Rack Active Status
export const toggleRackStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rack = await Rack.findById(req.params.id);
    if (!rack) throw new AppError('Rack not found', 404);
    rack.isActive = !rack.isActive;
    await rack.save();
    res.json(new APIResponse(true, `Rack status set to ${rack.isActive}`, rack));
  } catch (err) {
    next(err);
  }
};

// DELETE Rack (prevent if stock exists)
export const deleteRack = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stockCount = await Stock.countDocuments({ rack: req.params.id });
    if (stockCount > 0) throw new AppError('Cannot delete rack with active stock', 400);

    await Rack.findByIdAndDelete(req.params.id);
    res.json(new APIResponse(true, 'Rack deleted'));
  } catch (err) {
    next(err);
  }
};
