\! echo "Changing database"
use leudla;

\! echo "Dropping objects ...";
drop table if exists relationship;
drop table if exists entity;
drop procedure if exists insert_entity;
drop procedure if exists insert_relationship;
drop procedure if exists share_entity;
drop procedure if exists share_relationship;
\! echo "... done";


\! echo "Creating entity table ...";
create table entity (
  _id int auto_increment primary key,
  _user_id int,
  _name varchar(250),
  _from datetime,
  _until datetime,
  _texture text,
  _text text,
  _data json, 
  _type varchar(50)
);
\! echo "... done";

\! echo "Creating relationship table ..."
create table relationship (
  _id int auto_increment primary key,
  _user_id int,
  _entity_id int,
  _source_id int,
  _target_id int,
  _type varchar(50),

  foreign key (_entity_id)
    references entity(_id)
    on delete cascade,

  foreign key (_source_id)
    references entity(_id)
    on delete cascade,

  foreign key (_target_id)
    references entity(_id)
    on delete cascade
);
\! echo "... done";

\! echo "Creating insert_entity stored procedure ...";
delimiter //
create procedure insert_entity
(
  in _user_id int, 
  in _name varchar(250),
  in _from datetime,
  in _until datetime,
  in _texture text,
  in _text text,
  in _data json,
  in _type varchar(50),
  out _id int
)
begin
  set autocommit = 0;

  start transaction;

  insert into entity (_user_id, _name, _from, _until, _texture, _text, _data, _type)
  values (_user_id, _name, _from, _until, _texture, _data, _type);

  set _id = last_insert_id();

  commit;
end //
delimiter ;
\! echo "... done"

\! echo "Creating insert_relationship stored procedure ...";
delimiter //
create procedure insert_relationship
(
  in _user_id int,
  in _entity_id int,  
  in _source_id int, 
  in _target_id int,
  in _name varchar(250),
  in _from datetime,
  in _until datetime,
  in _texture text,
  in _text text,
  in _data json,
  in _type varchar(50),
  out _id int
)
begin
  set autocommit = 0;

  start transaction;

  call insert_entity(_user_id, _name, _from, _until, _texture, _text, _data, 'relationship', _id);
  insert into relationship(_user_id, _entity_id, _source_id, _target_id, _type)
  values (_user_id, last_insert_id, _source_id, _target_id);

  set _id = last_insert_id();

  commit;
end //
delimiter ;
\! echo "... done"

\! echo "Creating share_entity stored procedure ..."
delimiter //
create procedure share_entity
(
  in _user_id int,
  in _entity_id int,
  in _from int,
  in _to int,
  in _anonymous boolean,
  out _id int
)
begin
  declare v_user_id int;
  declare v_name varchar(250);
  declare v_from datetime;
  declare v_until datetime;
  declare v_texture text;
  declare v_text text;
  declare v_data json;
  declare v_type varchar(50);

  set autocommit = 0;

  start transaction;

  select if(_anonymous, null, _user_id), _name, _from, _until, _texture, _text, _data, _type 
  into v_user_id, v_name, v_from, v_until, v_texture, v_text, v_data, v_type
  from relationship
  where _entity_id = _id
  and relationship._user_id = _user_id;

  call insert_entity(v_user_id, v_name, v_from, v_until, v_texture, v_text, v_data, v_type, _id);

  commit;
end //
delimiter ;
\! echo "... done";

\! echo "Creating share_relationship stored procedure ..."
delimiter //
create procedure share_relationship
(
  in _user_id int,
  in _relationship_id int,
  in _from int,
  in _to int,
  in _anonymous boolean,
  out _id int
)
begin
  declare v_name varchar(250);
  declare v_from datetime;
  declare v_until datetime;
  declare v_texture text;
  declare v_text text;
  declare v_data json;
  declare v_type varchar(50);
  
  declare v_entity_id int;
  declare v_source_id int;
  declare v_target_id int;

  declare v_new_source_id int;
  declare v_new_target_id int;

  set autocommit = 0;

  start transaction;

  select e._name, e._from, e._until, e._texture, e._text, e._data, e._type
  into v_name, v_from, v_until, v_texture, v_text, v_data, v_type
  from relationship r
  inner join entity e on e.id = r._entity_id
  where r._id = _relationship_id 
  and e._user_id = v_from 
  and r._user_id = v_from;

  /* copy the entities */
  select _source_id, _target_id 
  into v_source_id, v_target_id  
  from relationship
  where _id = _relationship_id
  and _user_id = v_from;

  call share_entity(_user_id, v_source_id, _from, _to, _anonymous, v_new_source_id);
  call share_entity(_user_id, v_target_id, _from, _to, _anonymous, v_new_target_id);

  call insert_relationship(
    _to,
    v_entity_id,
    v_new_source_id,
    v_new_target_id,
    v_name,
    v_from,
    v_until,
    v_texture,
    v_text,
    v_data,
    v_type,
    _id
  );

  commit;
end //
delimiter ;
\! echo "... done";

