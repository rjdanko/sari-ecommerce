<?php

namespace App\Enums;

enum RoleEnum: string
{
    case USER = 'user';
    case BUSINESS = 'business';
    case ADMIN = 'admin';
}
