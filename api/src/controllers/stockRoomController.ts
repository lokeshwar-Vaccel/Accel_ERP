import { Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import { isValidObjectId } from 'mongoose';
import { APIResponse } from '../utils/apiResponse';
import { Rack, Room } from '../models/Stock';
import { AuthenticatedRequest } from '../types';

// CREATE Room
export const createRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, location, description, isActive } = req.body;

    if (!isValidObjectId(location)) throw new AppError('Invalid location ID', 400);

    const room = await Room.create({ name, location, description, isActive });
    res.status(201).json(new APIResponse(true, 'Room created successfully', room));
  } catch (err) {
    next(err);
  }
};

// GET Rooms with Pagination, Filter
export const getRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, search = '', location } = req.query;
    const filter: any = {
      ...(location && { location }),
      ...(search && { name: { $regex: search, $options: 'i' } }),
    };

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('location', 'name type ')
        // .skip((+page - 1) * +limit)
        // .limit(+limit)
        .sort({"name":1}),
      Room.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / Number(limit));

    // res.json(new APIResponse(true, 'Rooms fetched', { 
    //   rooms, 
    //   pagination: {
    //   page: Number(page),
    //   limit: Number(limit),
    //   total,
    //   pages,
    // } }));
    const response: any = {
      success: true,
      message: 'Rooms retrieved successfully',
      data: { rooms },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
    };

    res.status(200).json(response);

  } catch (err) {
    next(err);
  }
};

// UPDATE Room
export const updateRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) throw new AppError('Room not found', 404);
    res.json(new APIResponse(true, 'Room updated', room));
  } catch (err) {
    next(err);
  }
};

// TOGGLE Room Active Status
export const toggleRoomStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new AppError('Room not found', 404);
    room.isActive = !room.isActive;
    await room.save();
    res.json(new APIResponse(true, `Room status set to ${room.isActive}`, room));
  } catch (err) {
    next(err);
  }
};

// DELETE Room (soft or prevent if has racks)
export const deleteRoom = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rackCount = await Rack.countDocuments({ room: req.params.id });
    if (rackCount > 0) throw new AppError('Cannot delete room with racks', 400);

    await Room.findByIdAndDelete(req.params.id);
    res.json(new APIResponse(true, 'Room deleted'));
  } catch (err) {
    next(err);
  }
};
